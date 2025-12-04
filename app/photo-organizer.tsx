import { Category, categoryService } from '@/services/categoryService';
import { fonts } from '@/styles/common';
import { useAuthStore } from '@/utils/authStore';
import { supabase } from '@/utils/supabase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  PixelRatio,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

const CATEGORIES_PER_PAGE = 6;
const CATEGORY_COUNT_PER_SIDE = 3;
const CATEGORY_GAP = 8;

// Dynamic category item height calculation
const calculateCategoryItemHeight = (availableHeight: number) => {
  const verticalPadding = Math.min(40, availableHeight * 0.08);
  const totalGaps = CATEGORY_GAP * (CATEGORY_COUNT_PER_SIDE - 1);
  const itemHeight = (availableHeight - verticalPadding * 2 - totalGaps) / CATEGORY_COUNT_PER_SIDE;

  return {
    itemHeight: Math.max(100, Math.min(160, itemHeight)),  // 100 ~ 160 range
    verticalPadding: Math.max(20, verticalPadding),
  };
};

const CATEGORY_COLORS = [
  '#EDA6A6', '#9CC48D', '#C894D6', '#A8A6ED', '#E8D896', '#8ED6D6'
];

// Upload helpers
async function uriToBytes(uri: string): Promise<Uint8Array> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary =
    typeof atob !== 'undefined'
      ? atob(base64)
      : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function uploadToStorage(
  bucket: string,
  objectPath: string,
  bytes: Uint8Array,
  contentType: string = 'image/jpeg'
): Promise<string> {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(objectPath, bytes, {
      contentType,
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
  return data.publicUrl;
}

interface HistoryItem {
  type: 'categorize' | 'trash';
  image: ImagePicker.ImagePickerAsset;
  categoryId?: string; // Only for categorize
  note?: string;
}

export default function PhotoOrganizerScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { profileId } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isExitModalVisible, setIsExitModalVisible] = useState(false);
  const [selectedImages, setSelectedImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  // New State
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [batchSelection, setBatchSelection] = useState<Set<string>>(new Set());
  const [currentNote, setCurrentNote] = useState('');
  const [hasUploaded, setHasUploaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Progress & History State
  const [totalUploadedCount, setTotalUploadedCount] = useState(0);
  const [categorizedCount, setCategorizedCount] = useState(0); // Includes trashed
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Image Expansion State
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);

  // Animation Shared Values
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const scale = useSharedValue(1);

  // ============================================================
  // Responsive layout values (with SafeArea insets)
  // ============================================================
  const HEADER_HEIGHT = Math.max(56, height * 0.07);
  const STACK_CONTAINER_HEIGHT = Math.max(80, height * 0.1);
  const FOOTER_HEIGHT = Math.max(100, height * 0.15);
  const SIDE_COLUMN_WIDTH = Math.max(45, width * 0.12);

  const CARD_WIDTH = Math.min(320, width * 0.75);
  const CARD_HEIGHT = CARD_WIDTH * 1.15;

  const availableHeight = height - HEADER_HEIGHT - STACK_CONTAINER_HEIGHT - FOOTER_HEIGHT - insets.top - insets.bottom;
  const { itemHeight: CATEGORY_ITEM_HEIGHT, verticalPadding: VERTICAL_PADDING } =
    calculateCategoryItemHeight(availableHeight);

  const scaleFont = (size: number) => {
    const scale = width / 375;
    return Math.round(PixelRatio.roundToNearestPixel(size * scale));
  };

  useEffect(() => {
    if (profileId) {
      loadCategories();
    }
  }, [profileId]);

  const loadCategories = async () => {
    if (!profileId) return;
    try {
      const data = await categoryService.fetchCategories(profileId);
      const categoriesWithColors = data.map((cat, index) => ({
        ...cat,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }));
      setCategories(categoriesWithColors);

      // Fetch actual counts from DB
      const { data: photos, error } = await supabase
        .from('photos')
        .select('category_id')
        .eq('profile_id', profileId);

      if (error) {
        console.error('Failed to fetch photo counts:', error);
        const initialCounts: Record<string, number> = {};
        data.forEach(cat => initialCounts[cat.id] = 0);
        setCategoryCounts(initialCounts);
        return;
      }

      const counts: Record<string, number> = {};
      data.forEach(cat => counts[cat.id] = 0);

      photos?.forEach(photo => {
        if (photo.category_id) {
          counts[photo.category_id] = (counts[photo.category_id] || 0) + 1;
        }
      });

      setCategoryCounts(counts);

    } catch (error) {
      console.error('Failed to load categories', error);
    }
  };

  const handlePickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImages(prev => [...prev, ...result.assets]);
      setHasUploaded(true);
      setTotalUploadedCount(prev => prev + result.assets.length);
      Toast.show({
        type: 'success',
        text1: '\uc0ac\uc9c4\uc774 \ucd94\uac00\ub410\uc5b4\uc694', // 사진이 추가되었어요
        visibilityTime: 1000,
        position: 'top',
        topOffset: 100,
      });
    }
  };

  const handleBack = () => {
    setIsExitModalVisible(true);
  };

  const handleExit = () => {
    setIsExitModalVisible(false);
    router.back();
  };

  const handleContinue = () => {
    setIsExitModalVisible(false);
  };

  const toggleBatchSelection = (uri: string) => {
    setBatchSelection(prev => {
      const newSet = new Set(prev);
      if (newSet.has(uri)) {
        newSet.delete(uri);
      } else {
        newSet.add(uri);
      }
      return newSet;
    });
  };

  const handleCategorize = (categoryIndex: number, isLeft: boolean) => {
    const pageOffset = currentPage * CATEGORIES_PER_PAGE;
    const relativeIndex = isLeft ? categoryIndex : categoryIndex + 3;
    const actualIndex = pageOffset + relativeIndex;

    if (actualIndex < categories.length) {
      const category = categories[actualIndex];

      // Logic to handle batch or single
      if (isMultiSelectMode && batchSelection.size > 0) {
        // Batch categorize - History not fully supported for batch yet in this simple implementation
        // For now, just process
        const processedImages = selectedImages.filter(img => batchSelection.has(img.uri));

        setSelectedImages(prev => prev.filter(img => !batchSelection.has(img.uri)));
        setBatchSelection(new Set());
        setIsMultiSelectMode(false);

        // Update counts
        setCategorizedCount(prev => prev + processedImages.length);
        setCategoryCounts(prev => ({
          ...prev,
          [category.id]: (prev[category.id] || 0) + processedImages.length
        }));

        console.log(`Batch categorized to: ${category.name}`);
      } else {
        // Single categorize (top card)
        const imageToCategorize = selectedImages[0];
        if (!imageToCategorize) return;

        // Push to history
        setHistory(prev => [...prev, {
          type: 'categorize',
          image: imageToCategorize,
          categoryId: category.id,
          note: currentNote.trim() || undefined
        }]);

        setSelectedImages(prev => prev.slice(1));
        setCurrentNote(''); // Reset note

        // Update counts
        setCategorizedCount(prev => prev + 1);
        setCategoryCounts(prev => ({
          ...prev,
          [category.id]: (prev[category.id] || 0) + 1
        }));

        console.log(`Categorized to: ${category.name}`);
      }

      // Reset animation
      translationX.value = 0;
      translationY.value = 0;
      scale.value = 1;
    } else {
      // Invalid drop
      translationX.value = withSpring(0);
      translationY.value = withSpring(0);
      scale.value = withSpring(1);
    }
  };

  const handleTrash = () => {
    // Trash logic
    if (isMultiSelectMode && batchSelection.size > 0) {
      const processedImages = selectedImages.filter(img => batchSelection.has(img.uri));
      setSelectedImages(prev => prev.filter(img => !batchSelection.has(img.uri)));
      setBatchSelection(new Set());
      setIsMultiSelectMode(false);
      setCategorizedCount(prev => prev + processedImages.length);
    } else {
      const imageToTrash = selectedImages[0];
      if (!imageToTrash) return;

      // Push to history
      setHistory(prev => [...prev, {
        type: 'trash',
        image: imageToTrash
      }]);

      setSelectedImages(prev => prev.slice(1));
      setCurrentNote('');
      setCategorizedCount(prev => prev + 1);
    }

    translationX.value = 0;
    translationY.value = 0;
    scale.value = 1;
  };

  const handleUndo = () => {
    if (history.length === 0) return;

    const lastAction = history[history.length - 1];
    const newHistory = history.slice(0, -1);

    setHistory(newHistory);

    // Restore image to the FRONT of the stack
    setSelectedImages(prev => [lastAction.image, ...prev]);
    setCategorizedCount(prev => Math.max(0, prev - 1));

    if (lastAction.type === 'categorize' && lastAction.categoryId) {
      setCategoryCounts(prev => ({
        ...prev,
        [lastAction.categoryId!]: Math.max(0, (prev[lastAction.categoryId!] || 0) - 1)
      }));
    }

    // Reset note? Maybe keep empty or restore? For now reset.
    setCurrentNote('');
  };

  const handleComplete = async () => {
    if (isUploading) return;

    // Filter only categorized items (not trash)
    const categorizedItems = history.filter(item => item.type === 'categorize' && item.categoryId);

    if (categorizedItems.length === 0) {
      Alert.alert('\uc54c\ub9bc', '\ubd84\ub958\ub41c \uc0ac\uc9c4\uc774 \uc5c6\uc2b5\ub2c8\ub2e4.'); // 알림, 분류된 사진이 없습니다.
      return;
    }

    try {
      setIsUploading(true);
      const BUCKET = 'photos-v2';

      console.log('Starting upload process...');
      console.log('Profile ID:', profileId);
      // Upload all photos and save to DB
      for (let i = 0; i < categorizedItems.length; i++) {
        const item = categorizedItems[i];
        if (!item.categoryId) continue;
        console.log(`Processing item ${i + 1}/${categorizedItems.length}`);
        console.log('Category ID:', item.categoryId);

        // 1. Upload to Storage (original folder)
        const ts = Date.now() + i; // Unique timestamp
        const fileName = `photo_${profileId}_${ts}.jpg`;
        const filePath = `original/${fileName}`;

        const bytes = await uriToBytes(item.image.uri);
        const imageUrl = await uploadToStorage(BUCKET, filePath, bytes);
        console.log('Image uploaded to storage:', imageUrl);

        // 2. Save to DB
        const { error: insertError } = await supabase
          .from('photos')
          .insert({
            profile_id: profileId,
            category_id: item.categoryId,
            image_url: imageUrl,
            memo: item.note || null,
          });

        if (insertError) {
          console.error('DB Save Failed:', insertError);
          throw insertError;
        }
      }

      Alert.alert('\uc644\ub8cc', `${categorizedItems.length}\uc7a5\uc758 \uc0ac\uc9c4\uc744 \uc800\uc7a5\ud588\uc2b5\ub2c8\ub2e4!`, [ // 완료, N장의 사진을 저장했습니다!
        { text: '\ud655\uc778', onPress: () => router.back() } // 확인
      ]);

    } catch (error) {
      console.error('Photo Save Failed:', error);
      Alert.alert('\uc624\ub958', '\uc0ac\uc9c4 \uc800\uc7a5\uc5d0 \uc2e4\ud328\ud588\uc2b5\ub2c8\ub2e4. \ub2e4\uc2dc \uc2dc\ub3c4\ud574\uc8fc\uc138\uc694.'); // 오류, 사진 저장에 실패했습니다. 다시 시도해주세요.
    } finally {
      setIsUploading(false);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) setCurrentPage(prev => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) setCurrentPage(prev => prev + 1);
  };

  const openImageModal = () => {
    setIsImageModalVisible(true);
  };

  const closeImageModal = () => {
    setIsImageModalVisible(false);
  };

  const totalPages = Math.ceil(categories.length / CATEGORIES_PER_PAGE);
  const currentCategories = categories.slice(
    currentPage * CATEGORIES_PER_PAGE,
    (currentPage + 1) * CATEGORIES_PER_PAGE
  );

  const leftCategories = currentCategories.slice(0, 3);
  const rightCategories = currentCategories.slice(3, 6);

  const renderCategoryItem = (category: Category, isLeft: boolean) => (
    <View
      key={category.id}
      style={[
        styles.categoryItem,
        { height: CATEGORY_ITEM_HEIGHT },
        isLeft ? styles.categoryLeft : styles.categoryRight
      ]}
    >
      <View style={[styles.categoryColorBar, { backgroundColor: category.color }]} />
      <View style={styles.categoryContent}>
        <View style={[
          styles.categoryTextContainer,
          { width: Math.max(80, CATEGORY_ITEM_HEIGHT - 20) }
        ]}>
          <Text style={[styles.categoryName, { fontSize: scaleFont(12) }]} numberOfLines={1}>{category.name}</Text>
          <Text style={[styles.categoryCount, { fontSize: scaleFont(10) }]}>
            {categoryCounts[category.id] || 0}/100
          </Text>
        </View>
      </View>
    </View>
  );

  const renderSelectedImagesStack = () => {
    if (selectedImages.length === 0) return null;

    return (
      <View style={[styles.stackContainer, { height: STACK_CONTAINER_HEIGHT }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stackContent}>
          {selectedImages.map((img, index) => {
            const isSelected = batchSelection.has(img.uri);
            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.stackedImageContainer,
                  { zIndex: selectedImages.length - index },
                  isSelected && styles.batchSelectedImage
                ]}
                onPress={() => {
                  if (isMultiSelectMode) {
                    toggleBatchSelection(img.uri);
                  }
                }}
                disabled={!isMultiSelectMode}
              >
                <Image source={{ uri: img.uri }} style={styles.stackedImage} />
                {isMultiSelectMode && (
                  <View style={styles.checkboxContainer}>
                    <Ionicons
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={isSelected ? "#5B8DEF" : "white"}
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // Gesture Handler
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translationX.value = e.translationX;
      translationY.value = e.translationY;
      scale.value = withTiming(1.05, { duration: 100 });
    })
    .onEnd((e) => {
      const DROP_THRESHOLD_X = 100;
      const Y_ZONE_THRESHOLD = 80;
      const TRASH_THRESHOLD_Y = 150;

      // Check Trash
      // Only trigger trash if dragged down AND kept relatively in the center horizontally
      if (e.translationY > TRASH_THRESHOLD_Y && Math.abs(e.translationX) < 60) {
        runOnJS(handleTrash)();
        return;
      }

      let targetSide: 'left' | 'right' | null = null;
      let targetIndex = -1;

      if (e.translationX < -DROP_THRESHOLD_X) {
        targetSide = 'left';
      } else if (e.translationX > DROP_THRESHOLD_X) {
        targetSide = 'right';
      }

      if (targetSide) {
        if (e.translationY < -Y_ZONE_THRESHOLD) {
          targetIndex = 0;
        } else if (e.translationY > Y_ZONE_THRESHOLD) {
          targetIndex = 2;
        } else {
          targetIndex = 1;
        }

        runOnJS(handleCategorize)(targetIndex, targetSide === 'left');
      } else {
        translationX.value = withSpring(0);
        translationY.value = withSpring(0);
        scale.value = withSpring(1);
      }
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      runOnJS(openImageModal)();
    });

  // Combine gestures: Race allows either Pan or Tap. 
  // If Pan starts (move), Tap is cancelled. If Tap completes quickly without moving, Pan is cancelled.
  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translationX.value },
      { translateY: translationY.value },
      { scale: scale.value },
      { rotate: `${translationX.value / 20}deg` }
    ],
  }));

  const renderCenterContent = () => {
    if (selectedImages.length === 0) {
      if (hasUploaded) {
        return (
          <View style={styles.completeContainer}>
            <Ionicons name="checkmark-circle-outline" size={scaleFont(64)} color="#5B8DEF" />
            <Text style={[styles.completeText, { fontSize: scaleFont(20) }]}>{'\uc815\ub9ac \uc644\ub8cc!'}</Text>
          </View>
        );
      } else {
        return (
          <TouchableOpacity style={styles.uploadButton} onPress={handlePickImages}>
            <MaterialCommunityIcons name="upload" size={scaleFont(24)} color="#A8A6ED" />
            <Text style={[styles.uploadButtonText, { fontSize: scaleFont(16) }]}>{'\uc0ac\uc9c4 \uc5c5\ub85c\ub4dc'}</Text>
          </TouchableOpacity>
        );
      }
    }

    return (
      <View style={styles.centerStackContainer}>
        {/* Progress Indicators */}
        <View style={[styles.progressContainer, { width: CARD_WIDTH }]}>
          {/* Undo Button */}
          {history.length > 0 ? (
            <TouchableOpacity onPress={handleUndo} style={styles.undoButton}>
              <Ionicons name="arrow-undo" size={scaleFont(20)} color="white" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: scaleFont(30) }} /> // Spacer
          )}

          {/* Progress Text */}
          <Text style={[styles.progressText, { fontSize: scaleFont(14) }]}>
            {categorizedCount}/{totalUploadedCount}
          </Text>
        </View>

        {/* Stacked Photos */}
        <View style={[styles.cardStack, { width: CARD_WIDTH, height: CARD_HEIGHT }]}>
          {selectedImages.slice(0, 2).map((img, index) => {
            const isTopCard = index === 0;
            const reverseIndex = index;

            // Visual styles
            const scaleVal = 1 - (reverseIndex * 0.05);
            const translateYVal = reverseIndex * 10;
            const opacityVal = 1 - (reverseIndex * 0.4); // More transparent for background

            if (isTopCard) {
              return (
                <GestureDetector key={img.uri} gesture={composedGesture}>
                  <Animated.View
                    style={[
                      styles.stackedCard,
                      { zIndex: 100, width: CARD_WIDTH, height: CARD_HEIGHT },
                      animatedStyle
                    ]}
                  >
                    <Image
                      source={{ uri: img.uri }}
                      style={styles.cardImage}
                      resizeMode="contain" // Respect aspect ratio
                    />
                  </Animated.View>
                </GestureDetector>
              );
            }

            return (
              <View
                key={img.uri}
                style={[
                  styles.stackedCard,
                  {
                    zIndex: 10 - index,
                    transform: [{ scale: scaleVal }, { translateY: translateYVal }],
                    opacity: opacityVal,
                    width: CARD_WIDTH,
                    height: CARD_HEIGHT
                  }
                ]}
              >
                <Image
                  source={{ uri: img.uri }}
                  style={styles.cardImage}
                  resizeMode="contain"
                  blurRadius={5} // Blur effect
                />
              </View>
            );
          }).reverse()}
        </View>

        {/* Note Input */}
        <View style={[styles.noteContainer, { width: CARD_WIDTH }]}>
          <TextInput
            style={[styles.noteInput, { fontSize: scaleFont(14) }]}
            placeholder={'\ub178\ud2b8\ub97c \uc785\ub825\ud574\uc8fc\uc138\uc694'} // 노트를 입력해주세요
            placeholderTextColor="#666"
            value={currentNote}
            onChangeText={setCurrentNote}
            multiline
          />
        </View>
      </View>
    );
  };

  // ============================================================
  // Dynamic styles
  // ============================================================
  const dynamicStyles = useMemo(() => StyleSheet.create({
    sideColumn: {
      width: SIDE_COLUMN_WIDTH,
      justifyContent: 'space-around',
      paddingVertical: VERTICAL_PADDING,
    },
    header: {
      minHeight: HEADER_HEIGHT,
    },
    footer: {
      height: FOOTER_HEIGHT,
    }
  }), [SIDE_COLUMN_WIDTH, VERTICAL_PADDING, HEADER_HEIGHT, FOOTER_HEIGHT]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, dynamicStyles.header]}>
          <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
            <Ionicons name="chevron-back" size={scaleFont(28)} color="white" />
          </TouchableOpacity>

          <View style={styles.headerControls}>
            {(selectedImages.length > 0 || hasUploaded) && (
              <>
                <TouchableOpacity
                  style={[styles.headerControlBtn, isMultiSelectMode && styles.activeControlBtn]}
                  onPress={() => setIsMultiSelectMode(!isMultiSelectMode)}
                >
                  <Text style={[styles.headerControlText, { fontSize: scaleFont(12) }]}>{'\uc5ec\ub7ec\uc7a5 \uc120\ud0dd'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerControlBtn} onPress={handlePickImages}>
                  <Text style={[styles.headerControlText, { fontSize: scaleFont(12) }]}>{'\uc0ac\uc9c4 \ucd94\uac00'}</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              onPress={handleComplete}
              style={[styles.doneButton, isUploading && styles.doneButtonDisabled]}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.doneButtonText, { fontSize: scaleFont(14) }]}>{'\uc644\ub8cc'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Selected Images Stack (Top) */}
        {renderSelectedImagesStack()}

        {/* Main Content */}
        <View style={styles.content}>
          {/* Left Categories */}
          <View style={[styles.sideColumnBase, dynamicStyles.sideColumn]}>
            {leftCategories.map(cat => renderCategoryItem(cat, true))}
          </View>

          {/* Center Area */}
          <View style={styles.centerArea}>
            {renderCenterContent()}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <View style={styles.paginationContainer}>
                <TouchableOpacity onPress={handlePrevPage} disabled={currentPage === 0} style={styles.pageButton}>
                  <Ionicons name="chevron-back" size={20} color={currentPage === 0 ? '#444' : 'white'} />
                </TouchableOpacity>

                <View style={styles.paginationDots}>
                  {Array.from({ length: totalPages }).map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        currentPage === index && styles.activeDot
                      ]}
                    />
                  ))}
                </View>

                <TouchableOpacity onPress={handleNextPage} disabled={currentPage === totalPages - 1} style={styles.pageButton}>
                  <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages - 1 ? '#444' : 'white'} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Right Categories */}
          <View style={[styles.sideColumnBase, dynamicStyles.sideColumn]}>
            {rightCategories.map(cat => renderCategoryItem(cat, false))}
          </View>
        </View>

        {/* Footer / Trash */}
        <View style={[styles.footer, dynamicStyles.footer]}>
          <View style={styles.trashZone}>
            <Ionicons name="trash-outline" size={scaleFont(32)} color="#666" style={{ marginTop: 30 }} />
          </View>
        </View>

        {/* Exit Modal */}
        <Modal
          visible={isExitModalVisible}
          transparent
          animationType="fade"
          onRequestClose={handleContinue}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxWidth: Math.min(320, width * 0.9) }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{'\ucde8\uc18c\ud558\uace0 \ub098\uac00\uc2dc\uaca0\uc5b4\uc694?'}</Text>
                <TouchableOpacity onPress={handleContinue}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalMessage}>{'\uc815\ub9ac\ud558\ub358 \ub0b4\uc6a9\uc774 \uc0ac\ub77c\uc838\uc694!'}</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                  <Text style={styles.continueButtonText}>{'\uc774\uc5b4\uc11c \ud558\uae30'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
                  <Text style={styles.exitButtonText}>{'\ub098\uac00\uae30'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Image Expansion Modal */}
        <Modal
          visible={isImageModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeImageModal}
        >
          <View style={styles.imageModalOverlay}>
            <TouchableOpacity style={styles.closeImageButton} onPress={closeImageModal}>
              <Ionicons name="close-circle" size={40} color="white" />
            </TouchableOpacity>
            {selectedImages.length > 0 && (
              <Image
                source={{ uri: selectedImages[0].uri }}
                style={styles.fullScreenImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Modal>

      </SafeAreaView>
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    // minHeight set dynamically
  },
  headerButton: {
    padding: 8,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerControlBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#666',
  },
  activeControlBtn: {
    backgroundColor: '#444',
    borderColor: '#888',
  },
  headerControlText: {
    color: 'white',
    fontSize: 12,
    fontFamily: fonts.medium,
  },
  doneButton: {
    backgroundColor: '#5B8DEF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  doneButtonDisabled: {
    opacity: 0.7,
  },
  doneButtonText: {
    color: 'white',
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  stackContainer: {
    // height set dynamically
    paddingVertical: 10,
  },
  stackContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  stackedImageContainer: {
    position: 'relative',
    marginRight: 4,
  },
  stackedImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  batchSelectedImage: {
    opacity: 0.5,
  },
  checkboxContainer: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    paddingTop: 20,
  },
  sideColumnBase: {
    justifyContent: 'space-around',
  },
  centerArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeContainer: {
    alignItems: 'center',
    gap: 16,
  },
  completeText: {
    color: 'white',
    fontSize: 20,
    fontFamily: fonts.bold,
  },
  centerStackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    maxHeight: 400,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // width set dynamically
    marginBottom: 10,
  },
  undoButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  progressText: {
    color: 'white',
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  cardStack: {
    // width/height set dynamically
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stackedCard: {
    position: 'absolute',
    // width/height set dynamically
    borderRadius: 16,
    backgroundColor: '#333', // Card background
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#444',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000', // Black background for letterboxing
  },
  noteContainer: {
    // width set dynamically
    marginTop: 10,
  },
  noteInput: {
    color: 'white',
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  categoryItem: {
    // height is set dynamically
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    marginBottom: CATEGORY_GAP,
    overflow: 'hidden',
    marginHorizontal: 4,
  },
  categoryLeft: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  categoryRight: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  categoryColorBar: {
    height: 12,
    width: '100%',
  },
  categoryContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  categoryTextContainer: {
    // width is set dynamically
    height: 45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    transform: [{ rotate: '90deg' }],
  },
  categoryName: {
    color: 'white',
    fontSize: 12,
    fontFamily: fonts.medium,
    textAlign: 'center',
    maxWidth: 100,
  },
  categoryCount: {
    color: '#888',
    fontSize: 10,
    fontFamily: fonts.regular,
  },
  uploadButton: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadButtonText: {
    color: 'white',
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: 20,
    gap: 8,
  },
  paginationDots: {
    flexDirection: 'row',
    gap: 8,
  },
  pageButton: {
    padding: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#444',
  },
  activeDot: {
    backgroundColor: 'white',
  },
  footer: {
    // height set dynamically
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
  },
  trashZone: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#2A2A2A',
    justifyContent: 'flex-start',
    alignItems: 'center',
    transform: [{ translateY: 100 }],
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#333',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: fonts.bold,
  },
  modalMessage: {
    color: '#AAA',
    fontSize: 14,
    fontFamily: fonts.regular,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  continueButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#666',
    alignItems: 'center',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: fonts.medium,
  },
  exitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#5B8DEF',
    alignItems: 'center',
  },
  exitButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: fonts.medium,
  },
  // Image Modal
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  closeImageButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
});