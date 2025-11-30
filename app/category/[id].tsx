import { colors, fonts } from '@/styles/common';
import { useAuthStore } from '@/utils/authStore';
import { supabase } from '@/utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Image,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const GAP = 2;
const ITEM_SIZE = (width - (GAP * (COLUMN_COUNT - 1))) / COLUMN_COUNT;

interface Photo {
    id: string;
    image_url: string;
    memo?: string;
    created_at: string;
}

export default function CategoryDetailScreen() {
    const router = useRouter();
    const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
    const { profileId } = useAuthStore();
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

    useEffect(() => {
        if (profileId && id) {
            fetchPhotos();
        }
    }, [profileId, id]);

    const fetchPhotos = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('photos')
                .select('*')
                .eq('profile_id', profileId)
                .eq('category_id', id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPhotos(data || []);
        } catch (error) {
            console.error('Failed to fetch photos:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const renderItem = ({ item }: { item: Photo }) => (
        <TouchableOpacity onPress={() => setSelectedPhoto(item)}>
            <Image
                source={{ uri: item.image_url }}
                style={{ width: ITEM_SIZE, height: ITEM_SIZE, marginBottom: GAP, marginRight: GAP }}
                resizeMode="cover"
            />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>{name || 'Category'}</Text>
                    <View style={{ width: 28 }} />
                </View>

                {isLoading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : photos.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Text style={styles.emptyText}>{'\uc544\uc9c1 \uc774 \uce74\ud14c\uace0\ub9ac\uc5d0 \uc0ac\uc9c4\uc774 \uc5c6\uc5b4\uc694.'}</Text>
                    </View>
                ) : (
                    <FlatList
                        data={photos}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        numColumns={COLUMN_COUNT}
                        contentContainerStyle={styles.listContent}
                    />
                )}

                {/* Photo Detail Modal */}
                <Modal
                    visible={!!selectedPhoto}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setSelectedPhoto(null)}
                >
                    <View style={styles.modalContainer}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setSelectedPhoto(null)}
                        >
                            <Ionicons name="close" size={30} color="white" />
                        </TouchableOpacity>

                        {selectedPhoto && (
                            <>
                                <Image
                                    source={{ uri: selectedPhoto.image_url }}
                                    style={styles.fullImage}
                                    resizeMode="contain"
                                />
                                {selectedPhoto.memo && (
                                    <View style={styles.memoContainer}>
                                        <Text style={styles.memoText}>{selectedPhoto.memo}</Text>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </Modal>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    backButton: {
        padding: 4,
    },
    title: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: colors.text,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        // paddingHorizontal: GAP, // Optional if we want outer padding
    },
    emptyText: {
        fontSize: 16,
        color: colors.gray,
        fontFamily: fonts.medium,
    },
    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    fullImage: {
        width: '100%',
        height: '80%',
    },
    memoContainer: {
        position: 'absolute',
        bottom: 40,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 16,
        borderRadius: 8,
        maxWidth: '90%',
    },
    memoText: {
        color: 'white',
        fontSize: 16,
        fontFamily: fonts.medium,
        textAlign: 'center',
    },
});
