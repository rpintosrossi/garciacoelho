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
  addCategory: (category: Omit<Category, 'id' | 'productCount' | 'createdAt'>) => void;
  updateCategory: (id: string, category: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  getCategoryById: (id: string) => Category | undefined;
  getCategoryByName: (name: string) => Category | undefined;
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

  // Cargar categorías desde la API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await cachedApi.get('/categories');
        setCategories(response.data);
      } catch (error) {
        console.error('Error al cargar categorías:', error);
        // En caso de error, usar categorías por defecto
        const defaultCategories: Category[] = [
          {
            id: 'cat-1',
            name: 'Herramientas',
            description: 'Herramientas manuales y eléctricas',
            color: '#ff9800',
            productCount: 0,
            createdAt: '2025-01-15'
          },
          {
            id: 'cat-2',
            name: 'Materiales',
            description: 'Materiales de construcción y electricidad',
            color: '#4caf50',
            productCount: 0,
            createdAt: '2025-01-10'
          },
          {
            id: 'cat-3',
            name: 'Equipos',
            description: 'Equipos y maquinaria',
            color: '#2196f3',
            productCount: 0,
            createdAt: '2025-01-05'
          },
          {
            id: 'cat-4',
            name: 'Consumibles',
            description: 'Productos consumibles y repuestos',
            color: '#9c27b0',
            productCount: 0,
            createdAt: '2025-01-01'
          }
        ];
        setCategories(defaultCategories);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

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

  const value: CategoryContextType = {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryById,
    getCategoryByName,
  };

  return (
    <CategoryContext.Provider value={value}>
      {children}
    </CategoryContext.Provider>
  );
}; 