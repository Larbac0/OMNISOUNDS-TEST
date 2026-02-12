import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (beat, licenseType, price) => {
        const { items } = get();
        const existingIndex = items.findIndex(
          item => item.beat.id === beat.id && item.licenseType === licenseType
        );
        
        if (existingIndex >= 0) {
          return; // Already in cart
        }
        
        set({ items: [...items, { beat, licenseType, price }] });
      },
      
      removeItem: (beatId, licenseType) => {
        set((state) => ({
          items: state.items.filter(
            item => !(item.beat.id === beatId && item.licenseType === licenseType)
          )
        }));
      },
      
      clearCart: () => set({ items: [] }),
      
      getTotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.price, 0);
      },
    }),
    {
      name: 'ominsounds-cart',
    }
  )
);

export default useCartStore;
