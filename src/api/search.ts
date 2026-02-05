import apiClient from './client';

export interface SearchResult {
    id: string;
    media_id: string;
    caption: string;
    caption_ko?: string;
    tags?: string[];
    tags_ko?: string[];
    thumbnail_url: string;
    score: number;
    search_type?: string;
}

export interface SearchResponse {
    query: string;
    results: SearchResult[];
    total: number;
    search_mode?: string;
    cached?: boolean;
}

export type SearchMode = 'hybrid' | 'vector' | 'text';

export const searchApi = {
    // 검색
    async search(query: string, limit = 20, mode: SearchMode = 'hybrid'): Promise<SearchResponse> {
        const response = await apiClient.post<SearchResponse>('/search/', {
            query,
            mode,
            limit,
        });
        return response.data;
    },

    // 유사 이미지 검색
    async similar(mediaId: string, limit = 10): Promise<SearchResponse> {
        const response = await apiClient.get<SearchResponse>(`/search/similar/${mediaId}`, {
            params: { limit },
        });
        return response.data;
    },

    // 자동완성
    async suggestions(q: string): Promise<{ tags: string[]; words: string[] }> {
        const response = await apiClient.get('/search/suggestions', {
            params: { q, limit: 5 },
        });
        return response.data;
    },
};

export default searchApi;
