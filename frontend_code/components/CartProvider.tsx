"use client";
import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface Product {
  _id: string;
  name: string;
  images: string[];
  description: string;
  price: number;
  tags: string[];
  quantity?: number;
}

interface CartContextType {
  cart: Product[];
  addToCart: (product: Product) => void;
  removeFromCart: (_id: string) => void;
  updateQty: (_id: string, delta: number) => void;
  cartTotal: number;
  setCart: React.Dispatch<React.SetStateAction<Product[]>>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Product[]>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("cart");
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("cart", JSON.stringify(cart));
    }
  }, [cart]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      const addQty = product.quantity || 1;
      if (existing) {
        return prev.map((item) =>
          item._id === product._id ? { ...item, quantity: (item.quantity || 1) + addQty } : item
        );
      } else {
        return [
          ...prev,
          { ...product, quantity: addQty },
        ];
      }
    });
  };

  const removeFromCart = (_id: string) => {
    setCart((prev) => prev.filter((item) => item._id !== _id));
  };

  const updateQty = (_id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item._id === _id
          ? { ...item, quantity: Math.max(1, (item.quantity || 1) + delta) }
          : item
      )
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, cartTotal, setCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
} 