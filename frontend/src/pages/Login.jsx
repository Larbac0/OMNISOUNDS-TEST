import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Music, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authAPI } from '@/services/api';
import useAuthStore from '@/store/authStore';
import { toast } from 'sonner';

const Login = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      const { user, token } = response.data;
      
      setAuth(user, token);
      toast.success('Login realizado com sucesso!');
      
      if (user.role === 'PRODUCER') {
        navigate('/producer');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.detail || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center neon-purple">
            <Music className="w-6 h-6 text-white" strokeWidth={1.5} />
          </div>
          <span className="text-3xl font-bold" style={{ fontFamily: 'Manrope' }}>
            OMINSOUNDS
          </span>
        </div>

        {/* Form Card */}
        <div className="glass rounded-3xl p-8 shadow-2xl" data-testid="login-form">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Manrope' }}>
            Bem-vindo de volta
          </h1>
          <p className="text-muted-foreground mb-8">
            Faça login para continuar
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="seu@email.com"
                  className="pl-12 bg-black/20 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-xl h-14"
                  required
                  data-testid="email-input"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="pl-12 bg-black/20 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-xl h-14"
                  required
                  data-testid="password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full rounded-full bg-primary hover:bg-primary/90 h-14 text-lg font-medium"
              disabled={loading}
              data-testid="login-submit-button"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-muted-foreground">
              Não tem uma conta?{' '}
              <Link to="/register" className="text-primary hover:underline" data-testid="register-link">
                Registrar-se
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
