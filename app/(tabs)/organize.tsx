import { Category, categoryService } from '@/services/categoryService';
import { colors, commonStyles, fonts } from '@/styles/common';
import { useAuthStore } from '@/utils/authStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { DraggableGrid } from 'react-native-draggable-grid';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const GRID_SPACING = 12;
const ITEM_WIDTH = (width - 40 - (GRID_SPACING * (COLUMN_COUNT - 1))) / COLUMN_COUNT;

// Placeholder colors for categories
const CATEGORY_COLORS = [
  '#EDA6A6', // Red-ish
  '#9CC48D', // Green-ish
  '#C894D6', // Purple-ish
  '#A8A6ED', // Blue-ish
  '#E8D896', // Yellow-ish
  '#8ED6D6', // Cyan-ish
];

interface GridItem extends Category {
    key: string;
    disabledDrag?: boolean;
    disabledReOrder?: boolean;
}

export default function OrganizeScreen() {
  const { profileId } = useAuthStore();
  const [categories, setCategories] = useState<GridItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // New State for Edit/Delete/Reorder
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<GridItem | null>(null);
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isRenameMode, setIsRenameMode] = useState(false); // To reuse the add modal for renaming

  useEffect(() => {
    if (profileId) {
      loadCategories();
    }
  }, [profileId]);

  const loadCategories = async () => {
    if (!profileId) return;
    try {
      setIsLoading(true);
      const data = await categoryService.fetchCategories(profileId);
      // Assign colors on client side
      const categoriesWithColors = data.map((cat, index) => ({
        ...cat,
        key: cat.id,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }));
      setCategories(categoriesWithColors);
    } catch (error) {
      console.error('Failed to load categories', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (newCategoryName.trim().length === 0 || !profileId) return;

    try {
      const newCat = await categoryService.addCategory(profileId, newCategoryName);
      if (newCat) {
        const categoryWithColor = {
          ...newCat,
          key: newCat.id,
          color: CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length],
        };
        setCategories([...categories, categoryWithColor]);
        setNewCategoryName('');
        setIsModalVisible(false);
      }
    } catch (error) {
      console.error('Failed to add category', error);
    }
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory || newCategoryName.trim().length === 0) return;

    try {
        const updatedCat = await categoryService.updateCategory(selectedCategory.id, newCategoryName);
        if (updatedCat) {
            setCategories(prev => prev.map(cat => cat.id === selectedCategory.id ? { ...cat, name: updatedCat.name } : cat));
            setNewCategoryName('');
            setIsModalVisible(false);
            setIsRenameMode(false);
            setSelectedCategory(null);
        }
    } catch (error) {
        console.error('Failed to update category', error);
    }
  };

  const handleDeleteCategory = async () => {
      if (!selectedCategory) return;

      try {
          await categoryService.deleteCategory(selectedCategory.id);
          setCategories(prev => prev.filter(cat => cat.id !== selectedCategory.id));
          setIsDeleteModalVisible(false);
          setSelectedCategory(null);
      } catch (error) {
          console.error('Failed to delete category', error);
      }
  };

  const openRenameModal = () => {
      if (selectedCategory) {
          setNewCategoryName(selectedCategory.name);
          setIsRenameMode(true);
          setIsOptionsModalVisible(false);
          setIsModalVisible(true);
      }
  };

  const openDeleteModal = () => {
      setIsOptionsModalVisible(false);
      setIsDeleteModalVisible(true);
  };

  const renderGridItem = (item: GridItem) => {
    if (item.key === 'ADD_BUTTON') {
      return (
        <View style={[styles.gridItem, styles.addItem]}>
           <Ionicons name="add" size={40} color="#D9D9D9" />
        </View>
      );
    }

    return (
      <View style={styles.gridItemContainer}>
        <View style={[styles.gridItem, { backgroundColor: item.color || '#EDA6A6' }]}>
          <View style={styles.categoryShape} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
          <TouchableOpacity 
            style={styles.moreButton}
            onPress={() => {
                setSelectedCategory(item);
                setIsOptionsModalVisible(true);
            }}
          >
            <Ionicons name="ellipsis-horizontal" size={16} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Data for DraggableGrid
  // When in edit mode, we only show categories (no add button)
  // When NOT in edit mode, we show categories + add button (but DraggableGrid requires consistent data structure if we used it for both, 
  // but here we will switch between FlatList (View Mode) and DraggableGrid (Edit Mode) or just use DraggableGrid for Edit Mode)
  
  // Actually, to support "Add Button" at the end which is NOT draggable, we can just use FlatList for normal mode
  // And DraggableGrid for Edit Mode.

  const renderNormalItem = ({ item }: { item: GridItem | string }) => {
      if (item === 'ADD_BUTTON') {
        return (
            <TouchableOpacity
            style={[styles.gridItem, styles.addItem]}
            onPress={() => {
                setNewCategoryName('');
                setIsRenameMode(false);
                setIsModalVisible(true);
            }}
            >
            <Ionicons name="add" size={40} color="#D9D9D9" />
            </TouchableOpacity>
        );
      }
      
      const category = item as GridItem;
      return (
        <View style={styles.gridItemContainer}>
            <View style={[styles.gridItem, { backgroundColor: category.color || '#EDA6A6' }]}>
            <View style={styles.categoryShape} />
            </View>
            <View style={styles.categoryInfo}>
            <Text style={styles.categoryName} numberOfLines={1}>{category.name}</Text>
            <TouchableOpacity 
                style={styles.moreButton}
                onPress={() => {
                    setSelectedCategory(category);
                    setIsOptionsModalVisible(true);
                }}
            >
                <Ionicons name="ellipsis-horizontal" size={16} color={colors.text} />
            </TouchableOpacity>
            </View>
        </View>
      );
  };

  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity>
          <MaterialCommunityIcons name="arrow-up-down" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>my categories</Text>
        <TouchableOpacity onPress={() => setIsEditMode(!isEditMode)}>
          <Text style={[styles.editButton, isEditMode && styles.activeEditButton]}>
            {isEditMode ? '\uc644\ub8cc' : '\ud3b8\uc9d1'}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading && categories.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
            {isEditMode ? (
                <DraggableGrid
                    numColumns={COLUMN_COUNT}
                    renderItem={renderGridItem}
                    data={categories}
                    onDragRelease={(data) => {
                        setCategories(data as GridItem[]);
                    }}
                    itemHeight={ITEM_WIDTH + 40} // Adjust for text height
                    style={{ paddingHorizontal: 20 }}
                />
            ) : (
                <FlatList
                    data={[...categories, 'ADD_BUTTON']}
                    renderItem={renderNormalItem}
                    keyExtractor={(item) => (typeof item === 'string' ? item : item.id)}
                    numColumns={COLUMN_COUNT}
                    contentContainerStyle={styles.gridContent}
                    columnWrapperStyle={styles.columnWrapper}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
      )}

      {!isEditMode && (
        <View style={styles.footer}>
            <TouchableOpacity
            style={styles.organizeButton}
            onPress={() => router.push('/photo-organizer')}
            >
            <MaterialCommunityIcons name="pencil-outline" size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.organizeButtonText}>{'\uc0ac\uc9c4 \uc815\ub9ac\ud558\uae30'}</Text>
            </TouchableOpacity>
        </View>
      )}

      {/* Add/Rename Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                    {isRenameMode ? '\uc774\ub984 \uc218\uc815\ud558\uae30' : '\uce74\ud14c\uace0\ub9ac \uc774\ub984'}
                </Text>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={styles.input}
                placeholder={'\uc774\ub984\uc744 \uc785\ub825\ud574\uc8fc\uc138\uc694'}
                placeholderTextColor={colors.gray}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                autoFocus
              />
              <Text style={styles.helperText}>{'\ub098\uc911\uc5d0\ub3c4 \uc218\uc815\ud560 \uc218 \uc788\uc5b4\uc694.'}</Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>{'\ucde8\uc18c'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.addButton, !newCategoryName.trim() && styles.disabledButton]}
                  onPress={isRenameMode ? handleUpdateCategory : handleAddCategory}
                  disabled={!newCategoryName.trim()}
                >
                  <Text style={styles.addButtonText}>
                      {isRenameMode ? '\uc218\uc815\ud558\uae30' : '\ucd94\uac00\ud558\uae30'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Options Modal */}
      <Modal
        visible={isOptionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOptionsModalVisible(false)}
      >
          <TouchableWithoutFeedback onPress={() => setIsOptionsModalVisible(false)}>
            <View style={styles.modalOverlay}>
                <View style={styles.optionsModalContent}>
                    <Text style={styles.optionsTitle}>{selectedCategory?.name}</Text>
                    <TouchableOpacity style={styles.optionButton} onPress={openRenameModal}>
                        <Text style={styles.optionText}>{'\uc774\ub984 \uc218\uc815\ud558\uae30'}</Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.optionButton} onPress={openDeleteModal}>
                        <Text style={[styles.optionText, { color: '#FF6B6B' }]}>{'\uc0ad\uc81c\ud558\uae30'}</Text>
                    </TouchableOpacity>
                </View>
            </View>
          </TouchableWithoutFeedback>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={isDeleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDeleteModalVisible(false)}
      >
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>{'\uc815\ub9d0 \uc0ad\uc81c\ud558\uc2dc\uaca0\uc5b4\uc694?'}</Text>
                      <TouchableOpacity onPress={() => setIsDeleteModalVisible(false)}>
                          <Ionicons name="close" size={24} color={colors.textSecondary} />
                      </TouchableOpacity>
                  </View>
                  <Text style={styles.helperText}>{'\uce74\ud14c\uace0\ub9ac\uc5d0 \ub4e4\uc5b4\uc788\ub294 \uc0ac\uc9c4\ub3c4 \ubaa8\ub450 \uc0ad\uc81c\ub3fc\uc694.'}</Text>
                  
                  <View style={styles.modalButtons}>
                      <TouchableOpacity 
                          style={[styles.modalButton, styles.cancelButton]}
                          onPress={() => setIsDeleteModalVisible(false)}
                      >
                          <Text style={styles.cancelButtonText}>{'\ucde8\uc18c'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                          style={[styles.modalButton, { backgroundColor: '#FF6B6B' }]}
                          onPress={handleDeleteCategory}
                      >
                          <Text style={styles.addButtonText}>{'\uc0ad\uc81c\ud558\uae30'}</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.text,
  },
  editButton: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  activeEditButton: {
      color: colors.primary,
      fontFamily: fonts.bold,
  },
  gridContent: {
    padding: 20,
  },
  columnWrapper: {
    gap: GRID_SPACING,
    marginBottom: 24,
  },
  gridItemContainer: {
    width: ITEM_WIDTH,
    marginBottom: 8,
  },
  gridItem: {
    width: ITEM_WIDTH,
    height: ITEM_WIDTH,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  addItem: {
    backgroundColor: '#F5F5F5',
  },
  categoryShape: {
    width: '60%',
    height: '60%',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 100, // Circle by default for now
  },
  categoryInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  moreButton: {
    padding: 4,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 80, // Added margin to avoid overlap with tab bar
  },
  organizeButton: {
    flexDirection: 'row',
    backgroundColor: '#5B8DEF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  organizeButtonText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 340,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
    color: colors.text,
  },
  helperText: {
    fontSize: 12,
    color: colors.gray,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.border,
  },
  addButton: {
    backgroundColor: colors.primary,
  },
  disabledButton: {
    backgroundColor: colors.disabled,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.primary,
  },
  addButtonText: {
    fontSize: 16,
    color: 'white',
  },
  // Options Modal
  optionsModalContent: {
      backgroundColor: 'white',
      borderRadius: 16,
      paddingVertical: 16,
      width: '80%',
      maxWidth: 300,
      alignItems: 'center',
  },
  optionsTitle: {
      fontSize: 16,
      fontFamily: fonts.bold,
      color: colors.text,
      marginBottom: 16,
  },
  optionButton: {
      paddingVertical: 12,
      width: '100%',
      alignItems: 'center',
  },
  optionText: {
      fontSize: 16,
      fontFamily: fonts.medium,
      color: colors.text,
  },
  divider: {
      height: 1,
      width: '100%',
      backgroundColor: '#EEE',
  },
});
