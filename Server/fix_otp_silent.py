path = 'c:/Users/HP/OneDrive/Desktop/MockTestSeries/Server/routes/authRoutes.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """        } catch (mailError) {
          console.warn("Mail Send Failed or Timed Out:", mailError.message);
        }
      }
      
      res.json({
        message: "OTP sent successfully. (Check terminal in dev mode)",
      });"""

repl = """        } catch (mailError) {
          console.warn("Mail Send Failed or Timed Out:", mailError.message);
          const isProduction = process.env.NODE_ENV === "production" || !process.env.NODE_ENV;
          if (isProduction) {
            otpStore.delete(email);
            return res.status(500).json({
              message: "We couldn't send the OTP email right now. Please check server SMTP settings or try again."
            });
          }
        }
      }
      
      res.json({
        message: "OTP sent successfully. (Check terminal in dev mode)",
      });"""

content = content.replace(target, repl)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated authRoutes.js to not fail silently in production")
