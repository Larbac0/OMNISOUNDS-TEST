import React from 'react';
import { Link } from 'react-router-dom';
import { Music, Instagram, Twitter, Youtube } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-white/5 bg-card/50 mt-20">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <Music className="w-5 h-5 text-white" strokeWidth={1.5} />
              </div>
              <span className="text-xl font-bold" style={{ fontFamily: 'Manrope' }}>
                OMINSOUNDS
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              O marketplace premium para produtores e artistas brasileiros.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Explorar</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/explore" className="hover:text-white transition-colors">Beats</Link></li>
              <li><Link to="/explore?genre=Trap" className="hover:text-white transition-colors">Trap</Link></li>
              <li><Link to="/explore?genre=Hip Hop" className="hover:text-white transition-colors">Hip Hop</Link></li>
              <li><Link to="/explore?genre=R&B" className="hover:text-white transition-colors">R&B</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Produtor</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/register" className="hover:text-white transition-colors">Criar Conta</Link></li>
              <li><Link to="/producer" className="hover:text-white transition-colors">Dashboard</Link></li>
              <li><Link to="/producer/upload" className="hover:text-white transition-colors">Upload Beat</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4" style={{ fontFamily: 'Manrope' }}>Social</h3>
            <div className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                <Instagram className="w-5 h-5" strokeWidth={1.5} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                <Twitter className="w-5 h-5" strokeWidth={1.5} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all">
                <Youtube className="w-5 h-5" strokeWidth={1.5} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 mt-12 pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 OMINSOUNDS. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
