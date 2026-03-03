import { useState } from 'react';
import { supabase } from './supabaseClient'; // Ajuste o caminho se necessário
import './login.css';
import logo from './assets/LogoClickVerse.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) setError('Usuário ou senha inválidos');
    setLoading(false);
  };

  return (
    <div className="login-bg">
      <div className="login-card">
       <div className="login-header">
       <img src={logo} alt="Logo" className="logoControlmetrics.png" />
       <span className="brand-name">CONTROL METRICS</span>
     </div>
       
        
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Usuário ou E-mail</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="input-group">
            <label>Senha</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          <div className="options">
            <label><input type="checkbox" /> Manter logado</label>
            
          </div>

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Carregando...' : 'Login'}
          </button>
        </form>
        {error && <p className="error-msg">{error}</p>}
       
      </div>
    </div>
  );
}