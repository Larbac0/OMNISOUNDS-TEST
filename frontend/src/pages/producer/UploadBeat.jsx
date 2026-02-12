import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Music, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { beatsAPI } from '@/services/api';
import useAuthStore from '@/store/authStore';
import { toast } from 'sonner';

const GENRES = ['Trap', 'Hip Hop', 'R&B', 'Pop', 'Drill', 'Funk', 'Jazz', 'Afrobeat'];
const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const UploadBeat = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    bpm: '',
    key: '',
    genre: '',
    price_mp3: '',
    price_wav: '',
    price_exclusive: '',
    description: '',
  });

  React.useEffect(() => {
    if (user?.role !== 'PRODUCER' && user?.role !== 'ADMIN') {
      navigate('/');
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        toast.error('Por favor, selecione um arquivo de áudio válido');
        return;
      }
      setAudioFile(file);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem válida');
        return;
      }
      setImageFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!audioFile) {
      toast.error('Por favor, selecione um arquivo de áudio');
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('bpm', parseInt(formData.bpm));
      formDataToSend.append('key', formData.key);
      formDataToSend.append('genre', formData.genre);
      formDataToSend.append('price_mp3', parseFloat(formData.price_mp3));
      formDataToSend.append('price_wav', parseFloat(formData.price_wav));
      formDataToSend.append('price_exclusive', parseFloat(formData.price_exclusive));
      formDataToSend.append('description', formData.description);
      formDataToSend.append('audio_file', audioFile);
      if (imageFile) {
        formDataToSend.append('image_file', imageFile);
      }

      await beatsAPI.create(formDataToSend);
      toast.success('Beat enviado com sucesso!');
      navigate('/producer');
    } catch (error) {
      console.error('Error uploading beat:', error);
      toast.error(error.response?.data?.detail || 'Erro ao enviar beat');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-32">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        <div className="mb-12">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-2" style={{ fontFamily: 'Manrope' }} data-testid="upload-beat-title">
            Fazer Upload de Beat
          </h1>
          <p className="text-lg text-muted-foreground">
            Compartilhe sua música com o mundo
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-3xl p-8 space-y-6" data-testid="upload-beat-form">
          {/* Audio File */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Arquivo de Áudio *</label>
            <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioChange}
                className="hidden"
                id="audio-upload"
                data-testid="audio-file-input"
              />
              <label htmlFor="audio-upload" className="cursor-pointer">
                <Music className="w-12 h-12 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
                <p className="text-muted-foreground">
                  {audioFile ? audioFile.name : 'Clique para selecionar o arquivo de áudio (MP3, WAV)'}
                </p>
              </label>
            </div>
          </div>

          {/* Image File */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Imagem de Capa (Opcional)</label>
            <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="image-upload"
                data-testid="image-file-input"
              />
              <label htmlFor="image-upload" className="cursor-pointer">
                <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" strokeWidth={1.5} />
                <p className="text-muted-foreground">
                  {imageFile ? imageFile.name : 'Clique para selecionar a imagem'}
                </p>
              </label>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Título do Beat *</label>
            <Input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Ex: Dark Trap Beat"
              className="bg-black/20 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-xl h-14"
              required
              data-testid="title-input"
            />
          </div>

          {/* BPM, Key, Genre */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">BPM *</label>
              <Input
                type="number"
                name="bpm"
                value={formData.bpm}
                onChange={handleChange}
                placeholder="140"
                min="1"
                max="300"
                className="bg-black/20 border-white/10 h-12 rounded-xl"
                required
                data-testid="bpm-input"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Tonalidade *</label>
              <Select value={formData.key} onValueChange={(value) => handleSelectChange('key', value)} required>
                <SelectTrigger className="bg-black/20 border-white/10 h-12 rounded-xl" data-testid="key-select">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {KEYS.map((key) => (
                    <SelectItem key={key} value={key}>{key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Gênero *</label>
              <Select value={formData.genre} onValueChange={(value) => handleSelectChange('genre', value)} required>
                <SelectTrigger className="bg-black/20 border-white/10 h-12 rounded-xl" data-testid="genre-select">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((genre) => (
                    <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Preço MP3 (R$) *</label>
              <Input
                type="number"
                name="price_mp3"
                value={formData.price_mp3}
                onChange={handleChange}
                placeholder="29.90"
                min="0"
                step="0.01"
                className="bg-black/20 border-white/10 h-12 rounded-xl"
                required
                data-testid="price-mp3-input"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Preço WAV (R$) *</label>
              <Input
                type="number"
                name="price_wav"
                value={formData.price_wav}
                onChange={handleChange}
                placeholder="49.90"
                min="0"
                step="0.01"
                className="bg-black/20 border-white/10 h-12 rounded-xl"
                required
                data-testid="price-wav-input"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Preço Exclusivo (R$) *</label>
              <Input
                type="number"
                name="price_exclusive"
                value={formData.price_exclusive}
                onChange={handleChange}
                placeholder="499.90"
                min="0"
                step="0.01"
                className="bg-black/20 border-white/10 h-12 rounded-xl"
                required
                data-testid="price-exclusive-input"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Descrição (Opcional)</label>
            <Textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Descreva o estilo e mood do seu beat..."
              className="bg-black/20 border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-xl min-h-32"
              data-testid="description-input"
            />
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="button"
              onClick={() => navigate('/producer')}
              variant="outline"
              className="flex-1 rounded-full bg-white/5 border-white/10 hover:bg-white/10 h-14"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-full bg-primary hover:bg-primary/90 h-14 gap-2"
              disabled={loading}
              data-testid="upload-submit-button"
            >
              <Upload className="w-5 h-5" strokeWidth={1.5} />
              {loading ? 'Enviando...' : 'Publicar Beat'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadBeat;
