

const ForgotPassword = () => {
  return (
    <div className="login-page">
      <div className="top-left"></div>
      <div className="bottom-right"></div>
      <div className="big-circle"></div>
      <div className="small-circle"></div>
      <div className="login-card">
        <div className="logo-section">
          <img src="/path/to/logo.png" alt="Logo" />
          <h1>AppName</h1>
        </div>
        <h2>Forgot Password</h2>
        <p>Enter your email address and we'll send you a link to reset your password.</p>
        <form>
          <div className="input-box">
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" placeholder="Enter your email" />
          </div>
          <button type="submit">Send Reset Link</button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;