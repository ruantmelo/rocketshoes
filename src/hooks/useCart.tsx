import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      let product = cart.find(prod => prod.id === productId)
      
      if(!product){
        const {data} = await api.get<Omit<Product, 'amount'>>(`/products/${productId}`) 

        
        if(!data){
          throw new Error('Erro na adição do produto');
        }

        product = {...data, amount: 0};
        cart.push(product as Product);
      }
      
      if(!product){
        throw new Error();
      }

      const {data} = await api.get<Stock>(`/stock/${productId}`)

      const stock = data.amount;

      if (product.amount < stock){
        product.amount = product.amount + 1;
        setCart([...cart])
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
      }else{
        toast.error('Quantidade solicitada fora de estoque');
      }

      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if(!cart.find(prod => prod.id === productId)) throw new Error();
      
      setCart(oldCart => {
        const newCart = oldCart.filter(prod => prod.id !== productId)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

        return newCart;
      });
      
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) return;

      const { data } = await api.get(`/stock/${productId}`)

      const stock = data.amount;

      if(amount <= stock){
        const product = cart.find(prod => prod.id === productId);

        if(!product){
          throw new Error();
        }

        product.amount = amount;
        setCart([...cart])
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
      }else{
        toast.error('Quantidade solicitada fora de estoque');
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
