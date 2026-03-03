import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; 
import './login.css';
import logo from './assets/LogoClickVerse.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // ESTADO DO CHECKBOX
  const [rememberMe, setRememberMe] = useState(false);

  // Efeito para carregar o e-mail salvo, se existir
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

    if (loginError) {
      setError('Usuário ou senha inválidos');
      setLoading(false);
    } else {
      // LOGICA MANTER LOGADO: Salva ou remove o e-mail do navegador
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      // O login automático é gerenciado pelo próprio Supabase Session
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="login-header">
          <img src={logo} alt="Logo" className="logoControlmetrics.png" />
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
            <label>
              <input 
                type="checkbox" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              /> 
              Manter logado
            </label>
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