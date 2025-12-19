import apiClient from './client';

export interface SearchResult {
    id: string;
    media_id: string;
    caption: string;
    thumbnail_url: string;
    score: number;
}

export interface SearchResponse {
    query: string;
    results: SearchResult[];
    total: number;
}

export const searchApi = {
    // 검색
    async search(query: string, limit = 20): Promise<SearchResponse> {
        const response = await apiClient.post<SearchResponse>('/search/', {
            query,
            mode: 'hybrid',
            limit,
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
