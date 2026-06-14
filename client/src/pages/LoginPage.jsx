import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { checkSetupStatus, login, setupAdmin } from "../api";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  const { performLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkSetupStatus()
      .then(res => {
        setIsSetup(res.setupRequired);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (isSetup) {
        const data = await setupAdmin(username, password);
        performLogin(data.token, data.role, data.username);
        navigate("/");
      } else {
        const data = await login(username, password);
        performLogin(data.token, data.role, data.username);
        navigate("/");
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="page" style={{justifyContent: 'center', alignItems: 'center'}}><p>Loading...</p></div>;

  return (
    <div className="page" style={{justifyContent: 'center', alignItems: 'center'}}>
      <div className="panel" style={{maxWidth: '400px', width: '100%', padding: '2rem'}}>
        <div style={{marginBottom: '2rem', textAlign: 'center'}}>
          <h2 style={{margin: 0}}>{isSetup ? "Setup Admin Account" : "DPI Command Center"}</h2>
          <p className="muted">{isSetup ? "Welcome! Create the first admin user." : "Sign in to access the dashboard"}</p>
        </div>

        {error && <p style={{color: 'var(--color-rose-500)', marginBottom: '1rem', textAlign: 'center'}}>{error}</p>}

        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          <div>
            <label className="field-label">Username</label>
            <input 
              className="text-input" 
              type="text" 
              required 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
            />
          </div>
          <div>
            <label className="field-label">Password</label>
            <input 
              className="text-input" 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
          </div>
          <button className="btn btn-primary" type="submit" style={{marginTop: '1rem'}}>
            {isSetup ? "Create Admin" : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
