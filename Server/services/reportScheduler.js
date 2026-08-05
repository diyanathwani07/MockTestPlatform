const User = require("../models/User");
const AuditLog = require("../models/AuditLog");
const ReportLog = require("../models/ReportLog");
const sendEmail = require("../utils/sendEmail");

const processMonthlyAuditReport = async (forceSend = false) => {
  try {
    const now = new Date();
    
    // Check if it is the 1st of the month, or if forceSend is true (for testing)
    if (now.getDate() !== 1 && !forceSend) {
      return;
    }

    // Determine the previous month and year
    let prevMonth = now.getMonth() - 1;
    let prevYear = now.getFullYear();
    if (prevMonth === -1) {
      prevMonth = 11;
      prevYear -= 1;
    }

    const monthStr = String(prevMonth + 1).padStart(2, "0");
    const monthYearStr = `${monthStr}-${prevYear}`;

    // 1. Check if the report has already been sent for this month
    const existingLog = await ReportLog.findOne({
      reportType: "MonthlyAuditLog",
      monthYear: monthYearStr
    });

    if (existingLog && !forceSend) {
      console.log(`[ReportScheduler] Monthly Audit Log Report for ${monthYearStr} was already dispatched.`);
      return;
    }

    // 2. Find superadmins who opted in to receive monthly audit reports
    const recipients = await User.find({
      role: "superadmin",
      receiveMonthlyAuditReport: true,
      isDeleted: { $ne: true }
    });

    if (recipients.length === 0) {
      console.log(`[ReportScheduler] No superadmins registered or opted in to receive monthly reports.`);
      return;
    }

    const recipientEmails = recipients.map(user => user.email).join(", ");
    console.log(`[ReportScheduler] Preparing monthly audit report for recipients: ${recipientEmails}`);

    // 3. Query all audit logs for the previous month
    const startOfPrevMonth = new Date(prevYear, prevMonth, 1, 0, 0, 0, 0);
    const endOfPrevMonth = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59, 999);

    const logs = await AuditLog.find({
      createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth }
    }).sort({ createdAt: 1 });

    console.log(`[ReportScheduler] Found ${logs.length} logs for range: ${startOfPrevMonth.toISOString()} to ${endOfPrevMonth.toISOString()}`);

    // 4. Generate CSV
    const headers = ["User", "Action", "Target", "Date", "Time", "IP Address"];
    let csvContent = headers.join(",") + "\n";
    
    for (const log of logs) {
      const logDate = new Date(log.createdAt).toLocaleDateString("en-GB").replace(/\//g, "-");
      const logTime = new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const cleanDetails = (log.details || "").replace(/"/g, '""');
      
      const row = [
        `"${log.performedBy || ''}"`,
        `"${log.action || ''}"`,
        `"${cleanDetails}"`,
        `"${logDate}"`,
        `"${logTime}"`,
        `"${log.ipAddress || '-'}"`
      ];
      csvContent += row.join(",") + "\n";
    }

    const monthNames = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[prevMonth];

    // 5. Email the report to each recipient
    for (const admin of recipients) {
      await sendEmail({
        email: admin.email,
        subject: `Teaching Pariksha - Monthly Audit Log: ${monthName} ${prevYear}`,
        message: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background-color: #121324; color: #ffffff; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #6E3FF3; margin: 0; font-size: 24px;">🎓 Teaching Pariksha</h2>
              <p style="color: #9ca3af; font-size: 14px; margin-top: 4px;">Monthly Security & Action Audit Logs</p>
            </div>
            
            <div style="background-color: rgba(255, 255, 255, 0.03); padding: 24px; border-radius: 12px; border: 1.5px solid rgba(255, 255, 255, 0.08);">
              <h3 style="color: #ffffff; margin-top: 0; font-size: 18px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px;">Report Summary</h3>
              <table style="width: 100%; font-size: 14px; color: #d1d5db; margin-top: 12px; border-collapse: collapse;">
                <tr>
                  <td style="padding: 6px 0; font-weight: bold; width: 40%;">Report Month:</td>
                  <td style="padding: 6px 0; color: #ffffff;">${monthName} ${prevYear}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold;">Total Logged Actions:</td>
                  <td style="padding: 6px 0; color: #10B981; font-weight: bold;">${logs.length}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-weight: bold;">Export Date:</td>
                  <td style="padding: 6px 0;">${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}</td>
                </tr>
              </table>
            </div>

            <p style="color: #9ca3af; font-size: 13px; line-height: 1.6; margin-top: 24px; text-align: center;">
              Please find the complete CSV audit log attached to this email. This export is automated and sent in accordance with platform security policies.
            </p>
            
            <div style="text-align: center; margin-top: 32px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px;">
              <p style="color: #6b7280; font-size: 11px; margin: 0;">&copy; ${new Date().getFullYear()} Teaching Pariksha Admin Console. All rights reserved.</p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `audit_log_${monthYearStr}.csv`,
            content: csvContent
          }
        ]
      });
    }

    // 6. Record that the report was successfully sent
    if (!existingLog) {
      await ReportLog.create({
        reportType: "MonthlyAuditLog",
        monthYear: monthYearStr,
        recipient: recipientEmails
      });
    }

    console.log(`[ReportScheduler] Successfully dispatched monthly audit log report for ${monthYearStr}.`);

  } catch (error) {
    console.error("[ReportScheduler Error] Failed to generate or dispatch monthly report:", error);
  }
};

const startReportScheduler = () => {
  console.log("[ReportScheduler] Background monthly report scheduler started.");
  
  // Check once every hour
  setInterval(async () => {
    await processMonthlyAuditReport();
  }, 3600000);
};

module.exports = {
  startReportScheduler,
  processMonthlyAuditReport // Exported to allow manual/forced runs for testing
};
