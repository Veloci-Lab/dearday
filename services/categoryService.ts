import { supabase } from '@/utils/supabase';

export interface Category {
  id: string;
  name: string;
  // Color is not stored in DB, but handled on client side
  color?: string;
  display_order?: number;
  created_at?: string;
  icon_number?: number;
}

export const categoryService = {
  async fetchCategories(profileId: string): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name, created_at, display_order, icon_number')
      .eq('profile_id', profileId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }

    return data || [];
  },

  async addCategory(profileId: string, name: string, iconNumber?: number): Promise<Category | null> {
    // Get the current max display_order to append the new category at the end
    const { data: maxOrderData, error: maxOrderError } = await supabase
      .from('categories')
      .select('display_order')
      .eq('profile_id', profileId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrderData?.display_order ?? 0) + 1;

    const payload = {
      profile_id: profileId,
      name: name,
      display_order: nextOrder,
      icon_number: iconNumber,
    };
    console.log('addCategory payload:', payload);

    const { data, error } = await supabase
      .from('categories')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error adding category:', error);
      throw error;
    }

    return data;
  },

  async updateCategory(id: string, name: string, iconNumber?: number): Promise<Category | null> {
    const updatePayload: any = { name };
    if (iconNumber !== undefined) {
      updatePayload.icon_number = iconNumber;
    }
    console.log('updateCategory payload:', updatePayload);

    const { data, error } = await supabase
      .from('categories')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating category:', error);
      throw error;
    }

    return data;
  },

  async updateCategoryOrder(categories: Category[]): Promise<void> {
    const updates = categories.map((cat, index) => ({
      id: cat.id,
      display_order: index,
      // We need to include other required fields if we were using upsert with all fields,
      // but here we just want to update display_order.
      // However, supabase-js upsert usually requires all fields or a specific handling.
      // A better approach for bulk updates might be calling an RPC or looping.
      // Since we don't have a custom RPC, we will loop for now or use upsert if we can be sure about other fields.
      // Actually, 'upsert' works if we provide the primary key.
      // But we need to be careful not to overwrite other fields if we don't include them.
      // Supabase upsert updates existing rows if the primary key matches.
      // We should only include the fields we want to update if we use 'update' but 'update' doesn't support bulk in the same way.
      // Let's use a loop for simplicity and safety for now, or Promise.all.
    }));

    // Using Promise.all for parallel updates
    const updatePromises = updates.map(update => 
      supabase
        .from('categories')
        .update({ display_order: update.display_order })
        .eq('id', update.id)
    );

    const results = await Promise.all(updatePromises);
    
    const error = results.find(r => r.error)?.error;
    if (error) {
      console.error('Error updating category order:', error);
      throw error;
    }
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
