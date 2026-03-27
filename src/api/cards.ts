import apiClient from './client';
import type {
  TimelineDayResponse,
  CardDetail,
  CardUpdatePayload,
  AdjacentCards,
} from '../types/card';

export const cardsApi = {
  async getTimelineDay(date: string): Promise<TimelineDayResponse> {
    const response = await apiClient.get<TimelineDayResponse>('/timeline/day', {
      params: { date },
    });
    return response.data;
  },

  async getCardDetail(cardId: string): Promise<CardDetail> {
    const response = await apiClient.get<CardDetail>(`/cards/${cardId}`);
    return response.data;
  },

  async updateCard(cardId: string, payload: CardUpdatePayload): Promise<CardDetail> {
    const response = await apiClient.patch<CardDetail>(`/cards/${cardId}`, payload);
    return response.data;
  },

  async getAdjacentCards(cardId: string, date?: string): Promise<AdjacentCards> {
    const response = await apiClient.get<AdjacentCards>(`/cards/${cardId}/adjacent`, {
      params: date ? { date } : undefined,
    });
    return response.data;
  },
};

export default cardsApi;
