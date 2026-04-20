import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config';

const Login = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [status, setStatus] = useState({ loading: false, error: '' });
  const navigate = useNavigate();

  const handleInput = (e) => {
    // Clear error when user starts typing to improve UX
    if (status.error) setStatus({ ...status, error: '' });
    setCredentials({ ...credentials, [e.target.name]: e.target.value });
  };

  const submitAccess = async (e) => {
    e.preventDefault();
    setStatus({ loading: true, error: '' });

    try {
      const { data } = await axios.post(`${API_BASE_URL}/api/login`, credentials);
      
      if (data.success) {
        // Store user data safely
        localStorage.setItem('user', JSON.stringify(data.user || { name: credentials.username }));
        
        // Short delay for a smoother "Apple-style" transition
        setTimeout(() => {
          navigate('/pos');
        }, 500);
      } else {
        setStatus({ loading: false, error: data.message || 'Invalid Credentials' });
      }
    } catch (err) {
      console.error("Login Error:", err);
      setStatus({ 
        loading: false, 
        error: err.response?.data?.message || 'Server Connection Failed' 
      });
    }
  };

  return (
    <div className="login-viewport">
      <div className="login-card-container">
        <div className="login-branding">
          <div className="logo-symbol">PF</div> {/* Minimalist Symbol */}
          <h1>First<br/>Class</h1>
          <div className="accent-line"></div>
          <p>World Logistics & POS</p>
        </div>

        <form className="login-form" onSubmit={submitAccess}>
          {status.error && (
            <div className="login-error-toast" style={{ animation: 'shake 0.4s ease' }}>
              {status.error}
            </div>
          )}
          
          <div className="input-field-group">
            <input 
              name="username"
              type="text" 
              placeholder="Username" 
              value={credentials.username}
              onChange={handleInput}
              required 
              autoComplete="username"
            />
            <div className="input-focus-indicator"></div>
          </div>

          <div className="input-field-group">
            <input 
              name="password" 
              type="password" 
              placeholder="Password" 
              value={credentials.password}
              onChange={handleInput}
              required 
              autoComplete="current-password"
            />
            <div className="input-focus-indicator"></div>
          </div>

          <button 
            type="submit" 
            className={`login-cta ${status.loading ? 'btn-loading' : ''}`} 
            disabled={status.loading}
          >
            {status.loading ? (
              <span className="spinner-small"></span> 
            ) : 'LAUNCH DASHBOARD'}
          </button>
        </form>
      </div>
      
      {/* Visual Ambient Element */}
      <div className="ambient-background">
        <div className="blob-one"></div>
        <div className="blob-two"></div>
      </div>

      <footer className="login-footer">
        Property Flow • Powered by Codey Craft Africa
      </footer>
    </div>
  );
};

export default Login;