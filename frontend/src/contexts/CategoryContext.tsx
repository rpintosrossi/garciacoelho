'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { cachedApi } from '@/lib/axios';

export interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
  productCount: number;
  createdAt: string;
}

interface CategoryContextType {
  categories: Category[];
  loading: boolean;
  addCategory: (category: Omit<Category, 'id' | 'productCount' | 'createdAt'>) => Promise<void>;
  updateCategory: (id: string, category: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  getCategoryByName: (name: string) => Category | undefined;
  refreshCategories: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const useCategories = () => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
};

interface CategoryProviderProps {
  children: ReactNode;
}

export const CategoryProvider: React.FC<CategoryProviderProps> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar categorías desde el backend
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await cachedApi.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      // Si falla, intentar cargar desde localStorage como fallback
      const savedCategories = localStorage.getItem('stockCategories');
      if (savedCategories) {
        setCategories(JSON.parse(savedCategories));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Guardar en localStorage como backup
  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem('stockCategories', JSON.stringify(categories));
    }
  }, [categories]);

  const addCategory = async (categoryData: Omit<Category, 'id' | 'productCount' | 'createdAt'>) => {
    try {
      const response = await cachedApi.post('/categories', categoryData);
      setCategories(prev => [...prev, response.data]);
    } catch (error) {
      console.error('Error al crear categoría:', error);
      throw error;
    }
  };

  const updateCategory = async (id: string, categoryData: Partial<Category>) => {
    try {
      const response = await cachedApi.put(`/categories/${id}`, categoryData);
      setCategories(prev => 
        prev.map(cat => 
          cat.id === id ? response.data : cat
        )
      );
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      throw error;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await cachedApi.delete(`/categories/${id}`);
      setCategories(prev => prev.filter(cat => cat.id !== id));
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      throw error;
    }
  };

  const getCategoryById = (id: string) => {
    return categories.find(cat => cat.id === id);
  };

  const getCategoryByName = (name: string) => {
    return categories.find(cat => cat.name.toLowerCase() === name.toLowerCase());
  };

  const refreshCategories = async () => {
    await fetchCategories();
  };

  const value: CategoryContextType = {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    getCategoryByName,
    refreshCategories,
  };

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
}; 