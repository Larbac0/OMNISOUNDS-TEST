import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Download, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import useAuthStore from '@/store/authStore';
import { ordersAPI } from '@/services/api';
import { toast } from 'sonner';

const Orders = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [isAuthenticated]);

  const fetchOrders = async () => {
    try {
      const response = await ordersAPI.getAll();
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="w-5 h-5 text-green-500" strokeWidth={1.5} />;
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-500" strokeWidth={1.5} />;
      case 'FAILED':
        return <XCircle className="w-5 h-5 text-red-500" strokeWidth={1.5} />;
      case 'REFUNDED':
        return <RefreshCw className="w-5 h-5 text-blue-500" strokeWidth={1.5} />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />;
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      PAID: 'bg-green-500/20 text-green-500 border-green-500/30',
      PENDING: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
      FAILED: 'bg-red-500/20 text-red-500 border-red-500/30',
      REFUNDED: 'bg-blue-500/20 text-blue-500 border-blue-500/30'
    };
    
    const labels = {
      PAID: 'Pago',
      PENDING: 'Pendente',
      FAILED: 'Falhou',
      REFUNDED: 'Reembolsado'
    };

    return (
      <Badge variant="outline" className={`${variants[status] || ''} rounded-full`}>
        {labels[status] || status}
      </Badge>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = async (orderId, beatId) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/orders/${orderId}/download/${beatId}`,
        {
          headers: {
            'Authorization': `Bearer ${JSON.parse(localStorage.getItem('ominsounds-auth')).state.token}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        window.open(data.download_url, '_blank');
      } else {
        toast.error('Erro ao baixar beat');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Erro ao baixar beat');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-32 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-32" data-testid="orders-page">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <h1 
          className="text-3xl md:text-4xl font-bold tracking-tight mb-8"
          style={{ fontFamily: 'Manrope' }}
        >
          Meus Pedidos
        </h1>

        {orders.length === 0 ? (
          <div className="text-center py-20 glass rounded-2xl">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" strokeWidth={1} />
            <p className="text-xl text-muted-foreground mb-4">
              Você ainda não tem pedidos
            </p>
            <Button
              onClick={() => navigate('/explore')}
              className="rounded-full bg-primary hover:bg-primary/90"
            >
              Explorar Beats
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div 
                key={order.id} 
                className="glass rounded-2xl overflow-hidden"
                data-testid={`order-${order.id}`}
              >
                {/* Order Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between p-6 border-b border-white/10">
                  <div className="flex items-center gap-4 mb-4 md:mb-0">
                    {getStatusIcon(order.status)}
                    <div>
                      <p className="font-medium">
                        Pedido #{order.id.slice(0, 8)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {getStatusBadge(order.status)}
                    <span className="text-xl font-bold text-primary">
                      R$ {order.total.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-6">
                  <div className="space-y-4">
                    {order.items.map((item) => (
                      <div 
                        key={item.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white/5"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.beat_title}</p>
                          <p className="text-sm text-muted-foreground">
                            Licença: {item.license_type}
                          </p>
                        </div>
                        
                        <span className="text-primary font-medium">
                          R$ {item.price.toFixed(2)}
                        </span>
                        
                        {order.status === 'PAID' && (
                          <Button
                            onClick={() => handleDownload(order.id, item.beat_id)}
                            size="sm"
                            className="rounded-full bg-primary hover:bg-primary/90"
                            data-testid={`download-${item.beat_id}`}
                          >
                            <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
                            Download
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
