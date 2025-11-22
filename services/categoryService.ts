import { supabase } from '@/utils/supabase';

export interface Category {
  id: string;
  name: string;
  // Color is not stored in DB, but handled on client side
  color?: string;
}

export const categoryService = {
  async fetchCategories(profileId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, created_at')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }

    return data || [];
  },

  async addCategory(profileId: string, name: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from('categories')
      .insert([
        {
          profile_id: profileId,
          name: name,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding category:', error);
      throw error;
    }

    return data;
  },

  async updateCategory(id: string, name: string): Promise<Category | null> {
    const { data, error } = await supabase
      .from('categories')
      .update({ name })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      throw error;
    }

    return data;
  },

  async deleteCategory(id: string): Promise<void> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },
};
