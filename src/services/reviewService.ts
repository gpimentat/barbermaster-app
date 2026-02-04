
import { supabase } from '../supabaseClient';

export interface Review {
    id: string;
    tenant_id: string;
    client_id: string;
    client_name: string;
    rating: number;
    comment: string;
    photo_url: string | null;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

const reviewService = {
    async getPendingReviews(tenantId: string): Promise<Review[]> {
        const { data, error } = await supabase
            .from('client_reviews')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getAllReviews(tenantId: string): Promise<Review[]> {
        const { data, error } = await supabase
            .from('client_reviews')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async updateReviewStatus(reviewId: string, status: 'approved' | 'rejected'): Promise<void> {
        const { error } = await supabase
            .from('client_reviews')
            .update({ status })
            .eq('id', reviewId);

        if (error) throw error;
    },

    async deleteReview(reviewId: string): Promise<void> {
        const { error } = await supabase
            .from('client_reviews')
            .delete()
            .eq('id', reviewId);

        if (error) throw error;
    }
};

export default reviewService;
