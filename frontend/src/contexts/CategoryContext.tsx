'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

  // Cargar categorías desde localStorage al inicializar
  useEffect(() => {
    const savedCategories = localStorage.getItem('stockCategories');
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    } else {
      // Categorías por defecto
      const defaultCategories: Category[] = [
        {
          id: '1',
          name: 'Herramientas',
          description: 'Herramientas manuales y eléctricas',
          color: '#ff9800',
          productCount: 0,
          createdAt: '2025-01-15'
        },
        {
          id: '2',
          name: 'Materiales',
          description: 'Materiales de construcción y electricidad',
          color: '#4caf50',
          productCount: 0,
          createdAt: '2025-01-10'
        },
        {
          id: '3',
          name: 'Equipos',
          description: 'Equipos y maquinaria',
          color: '#2196f3',
          productCount: 0,
          createdAt: '2025-01-05'
        },
        {
          id: '4',
          name: 'Consumibles',
          description: 'Productos consumibles y repuestos',
          color: '#9c27b0',
          productCount: 0,
          createdAt: '2025-01-01'
        }
      ];
      setCategories(defaultCategories);
      localStorage.setItem('stockCategories', JSON.stringify(defaultCategories));
    }
  }, []);

  // Guardar categorías en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('stockCategories', JSON.stringify(categories));
  }, [categories]);

  const addCategory = (categoryData: Omit<Category, 'id' | 'productCount' | 'createdAt'>) => {
    const newCategory: Category = {
      id: Date.now().toString(),
      ...categoryData,
      productCount: 0,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setCategories(prev => [...prev, newCategory]);
  };

  const updateCategory = (id: string, categoryData: Partial<Category>) => {
    setCategories(prev => 
      prev.map(cat => 
        cat.id === id ? { ...cat, ...categoryData } : cat
      )
    );
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(cat => cat.id !== id));
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