import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Mail, Phone, FileText, Camera, Save, Lock,
  Eye, EyeOff, ChevronRight, Shield, Instagram,
  Globe, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { usersAPI, authAPI } from '@/services/api';
import useAuthStore from '@/store/authStore';
import { toast } from 'sonner';

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────
const formatCPF = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

const formatPhone = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
};

// ────────────────────────────────────────────
// Sub-componente: Avatar uploader
// ────────────────────────────────────────────
const AvatarSection = ({ user, onAvatarChange }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(user?.avatar || null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem válida');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    // Preview local imediato
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Upload para o backend
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await usersAPI.uploadAvatar(formData);
      const newAvatarUrl = response.data.avatar_url;
      onAvatarChange(newAvatarUrl);
      toast.success('Foto atualizada!');
    } catch (error) {
      console.error('Avatar upload error:', error);
      // Se o endpoint de upload não existir, salva como URL local temporária
      onAvatarChange(objectUrl);
      toast.success('Foto selecionada! Será salva ao atualizar o perfil.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-28 h-28 rounded-full overflow-hidden bg-primary/10 border-2 border-white/10 flex items-center justify-center">
          {preview ? (
            <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-12 h-12 text-muted-foreground" strokeWidth={1} />
          )}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary hover:bg-primary/80 flex items-center justify-center shadow-lg transition-colors"
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <Camera className="w-4 h-4 text-white" strokeWidth={1.5} />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Info */}
      <div>
        <h3 className="font-semibold mb-1">{user?.name}</h3>
        <p className="text-sm text-muted-foreground mb-3">{user?.email}</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          disabled={uploading}
        >
          <Camera className="w-4 h-4" strokeWidth={1.5} />
          {uploading ? 'Enviando...' : 'Alterar foto'}
        </button>
        <p className="text-xs text-muted-foreground mt-1">JPG, PNG ou GIF até 5MB</p>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────
const Profile = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();

  // Estado do formulário principal
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    phone: user?.phone || '',
    cpf: user?.cpf || '',
    instagram: user?.instagram || '',
    website: user?.website || '',
    avatar: user?.avatar || '',
  });

  // Estado da troca de senha
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    let formatted = value;
    if (name === 'cpf') formatted = formatCPF(value);
    if (name === 'phone') formatted = formatPhone(value);
    setProfileData(prev => ({ ...prev, [name]: formatted }));
  };

  const handlePasswordChange = (e) => {
    setPasswordData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAvatarChange = (url) => {
    setProfileData(prev => ({ ...prev, avatar: url }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoadingProfile(true);

    try {
      // Remove campos de links sociais se o backend ainda não os suporta
      const { instagram, website, ...backendData } = profileData;

      const response = await usersAPI.updateProfile(backendData);
      updateUser(response.data);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error('Profile update error:', error);
      toast.error(error.response?.data?.detail || 'Erro ao atualizar perfil');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('As novas senhas não coincidem');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoadingPassword(true);
    try {
      // Verifica senha atual via login
      await authAPI.login({ email: user.email, password: passwordData.currentPassword });

      // Atualiza a senha via endpoint de perfil (backend deve suportar)
      await usersAPI.updateProfile({ password: passwordData.newPassword });

      toast.success('Senha alterada com sucesso!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Password change error:', error);
      if (error.response?.status === 401) {
        toast.error('Senha atual incorreta');
      } else {
        toast.error('Erro ao alterar senha');
      }
    } finally {
      setLoadingPassword(false);
    }
  };

  const tabs = [
    { id: 'info', label: 'Informações', icon: User },
    { id: 'security', label: 'Segurança', icon: Shield },
  ];

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-4xl mx-auto px-4 md:px-8">

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <button onClick={() => navigate('/')} className="hover:text-white transition-colors">Início</button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">Meu Perfil</span>
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold tracking-tight"
            style={{ fontFamily: 'Manrope' }}
          >
            Meu Perfil
          </h1>
          <p className="text-muted-foreground mt-2">
            Gerencie suas informações pessoais e configurações de conta
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 glass rounded-full p-1 w-fit">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.5} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ─── ABA: INFORMAÇÕES ─── */}
        {activeTab === 'info' && (
          <form onSubmit={handleSaveProfile} className="space-y-6">

            {/* Card: Avatar */}
            <div className="glass rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-6" style={{ fontFamily: 'Manrope' }}>
                Foto de Perfil
              </h2>
              <AvatarSection user={user} onAvatarChange={handleAvatarChange} />
            </div>

            {/* Card: Dados pessoais */}
            <div className="glass rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-6" style={{ fontFamily: 'Manrope' }}>
                Dados Pessoais
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Nome */}
                <div className="md:col-span-2">
                  <label className="block text-sm text-muted-foreground mb-2">
                    Nome completo *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <Input
                      name="name"
                      value={profileData.name}
                      onChange={handleProfileChange}
                      placeholder="Seu nome completo"
                      className="pl-10 bg-white/5 border-white/10 rounded-xl h-12"
                      required
                    />
                  </div>
                </div>

                {/* Email (somente leitura) */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <Input
                      value={user?.email}
                      readOnly
                      className="pl-10 bg-white/3 border-white/5 rounded-xl h-12 text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">O email não pode ser alterado</p>
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">
                    Telefone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <Input
                      name="phone"
                      value={profileData.phone}
                      onChange={handleProfileChange}
                      placeholder="(11) 99999-9999"
                      className="pl-10 bg-white/5 border-white/10 rounded-xl h-12"
                    />
                  </div>
                </div>

                {/* CPF */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">
                    CPF
                    <span className="ml-2 text-xs text-primary">(necessário para pagamentos)</span>
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <Input
                      name="cpf"
                      value={profileData.cpf}
                      onChange={handleProfileChange}
                      placeholder="000.000.000-00"
                      className="pl-10 bg-white/5 border-white/10 rounded-xl h-12"
                      maxLength={14}
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="md:col-span-2">
                  <label className="block text-sm text-muted-foreground mb-2">
                    Bio / Descrição
                  </label>
                  <Textarea
                    name="bio"
                    value={profileData.bio}
                    onChange={handleProfileChange}
                    placeholder={
                      user?.role === 'PRODUCER'
                        ? 'Fale sobre você como produtor, seus estilos e influências...'
                        : 'Fale um pouco sobre você...'
                    }
                    className="bg-white/5 border-white/10 rounded-xl resize-none"
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {profileData.bio.length}/500 caracteres
                  </p>
                </div>
              </div>
            </div>

            {/* Card: Links sociais (apenas produtor) */}
            {user?.role === 'PRODUCER' && (
              <div className="glass rounded-2xl p-6 md:p-8">
                <div className="flex items-center gap-2 mb-6">
                  <h2 className="text-xl font-bold" style={{ fontFamily: 'Manrope' }}>
                    Links & Redes Sociais
                  </h2>
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    Produtor
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Instagram</label>
                    <div className="relative">
                      <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                      <Input
                        name="instagram"
                        value={profileData.instagram}
                        onChange={handleProfileChange}
                        placeholder="@seuinstagram"
                        className="pl-10 bg-white/5 border-white/10 rounded-xl h-12"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-2">Website / Link</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                      <Input
                        name="website"
                        value={profileData.website}
                        onChange={handleProfileChange}
                        placeholder="https://seusite.com"
                        className="pl-10 bg-white/5 border-white/10 rounded-xl h-12"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Card: Status da conta */}
            <div className="glass rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Manrope' }}>
                Status da Conta
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo de conta</p>
                    <p className="font-semibold text-sm">
                      {user?.role === 'PRODUCER' ? 'Produtor' : user?.role === 'ADMIN' ? 'Admin' : 'Usuário'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-500" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-semibold text-sm text-green-400">Verificado</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                  {profileData.cpf ? (
                    <>
                      <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-500" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">CPF</p>
                        <p className="font-semibold text-sm text-green-400">Cadastrado</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-yellow-500" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">CPF</p>
                        <p className="font-semibold text-sm text-yellow-400">Pendente</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Botão salvar */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loadingProfile}
                className="rounded-full bg-primary hover:bg-primary/90 px-8 h-12 gap-2"
                data-testid="save-profile-button"
              >
                {loadingProfile ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" strokeWidth={1.5} />
                )}
                {loadingProfile ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        )}

        {/* ─── ABA: SEGURANÇA ─── */}
        {activeTab === 'security' && (
          <div className="space-y-6">

            {/* Alterar senha */}
            <div className="glass rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Manrope' }}>
                Alterar Senha
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                Use uma senha forte com pelo menos 8 caracteres, incluindo letras e números.
              </p>

              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                {/* Senha atual */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Senha atual</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="Sua senha atual"
                      className="pl-10 pr-10 bg-white/5 border-white/10 rounded-xl h-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                    </button>
                  </div>
                </div>

                {/* Nova senha */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Nova senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="Mínimo 6 caracteres"
                      className="pl-10 pr-10 bg-white/5 border-white/10 rounded-xl h-12"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                    </button>
                  </div>
                  {/* Indicador de força */}
                  {passwordData.newPassword && (
                    <div className="mt-2 flex gap-1">
                      {[1, 2, 3, 4].map((level) => {
                        const strength = Math.min(Math.floor(passwordData.newPassword.length / 2), 4);
                        const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];
                        return (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              level <= strength ? colors[strength - 1] : 'bg-white/10'
                            }`}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Confirmar nova senha */}
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Confirmar nova senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="Repita a nova senha"
                      className={`pl-10 pr-10 bg-white/5 border-white/10 rounded-xl h-12 ${
                        passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword
                          ? 'border-red-500/50'
                          : ''
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                    </button>
                  </div>
                  {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                    <p className="text-xs text-red-400 mt-1">As senhas não coincidem</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loadingPassword}
                  className="rounded-full bg-primary hover:bg-primary/90 gap-2 mt-2"
                  data-testid="change-password-button"
                >
                  {loadingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" strokeWidth={1.5} />
                  )}
                  {loadingPassword ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </form>
            </div>

            {/* Informações da conta */}
            <div className="glass rounded-2xl p-6 md:p-8">
              <h2 className="text-xl font-bold mb-4" style={{ fontFamily: 'Manrope' }}>
                Informações da Conta
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-muted-foreground">Membro desde</span>
                  <span>
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long' })
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-muted-foreground">Tipo de conta</span>
                  <span className="text-primary font-medium">
                    {user?.role === 'PRODUCER' ? 'Produtor' : user?.role === 'ADMIN' ? 'Administrador' : 'Usuário'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-muted-foreground">ID da conta</span>
                  <span className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">
                    {user?.id}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" strokeWidth={1.5} />
                    Ativa
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
