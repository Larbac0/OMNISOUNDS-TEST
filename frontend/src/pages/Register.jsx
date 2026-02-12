import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Music, Mail, Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authAPI } from '@/services/api';
import useAuthStore from '@/store/authStore';
import { toast } from 'sonner';

const Register = () => {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
    role: 'USER',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleRoleChange = (value) => {
    setFormData(prev => ({ ...prev, role: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);

    try {
      const { confirmPassword, ...registerData } = formData;
      const response = await authAPI.register(registerData);
      const { user, token } = response.data;
      
      setAuth(user, token);
      toast.success('Conta criada com sucesso!');
      
      if (user.role === 'PRODUCER') {
        navigate('/producer');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Register error:', error);
      toast.error(error.response?.data?.detail || 'Erro ao criar conta');
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
        <div className="glass rounded-3xl p-8 shadow-2xl" data-testid="register-form">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Manrope' }}>
            Criar Conta
          </h1>
          <p className="text-muted-foreground mb-8">
            Junte-se ao OMINSOUNDS hoje
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Seu nome"
                  className="pl-12 bg-black/20 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-xl h-14"
                  required
                  data-testid="name-input"
                />
              </div>
            </div>

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
              <label className="text-sm text-muted-foreground mb-2 block">Tipo de Conta</label>
              <Select value={formData.role} onValueChange={handleRoleChange}>
                <SelectTrigger className="bg-black/20 border-white/10 h-14 rounded-xl" data-testid="role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Usuário / Artista</SelectItem>
                  <SelectItem value="PRODUCER">Produtor</SelectItem>
                </SelectContent>
              </Select>
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

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Confirmar Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="pl-12 bg-black/20 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-xl h-14"
                  required
                  data-testid="confirm-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full rounded-full bg-primary hover:bg-primary/90 h-14 text-lg font-medium"
              disabled={loading}
              data-testid="register-submit-button"
            >
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-muted-foreground">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-primary hover:underline" data-testid="login-link">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
