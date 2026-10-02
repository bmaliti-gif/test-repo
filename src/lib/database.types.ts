// Types for the BoardZM database, matching supabase/migrations/0001–0004.
// Same shape as `supabase gen types typescript` output; keep it in sync when a migration changes.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Provider = 'mtn' | 'airtel' | 'zamtel';
export type PaymentsMode = 'simulated' | 'live';
export type Role = 'tenant' | 'landlord';
export type RoomCategory = 'single' | 'shared' | 'self_contained';
export type TypeLabel =
  | 'Self-contained room'
  | 'Bedsitter'
  | 'Bedspace'
  | 'Studio'
  | 'Cottage'
  | 'Single room'
  | 'Shared flat'
  | 'Shared house';
export type ListingStatus = 'draft' | 'in_review' | 'live' | 'reserved' | 'let' | 'rejected' | 'archived';
export type ReservationStatus = 'pending_payment' | 'held' | 'released' | 'refunded' | 'cancelled';
export type PaymentKind = 'reservation' | 'listing_fee' | 'feature_fee' | 'verification_fee';
export type PaymentStatus = 'pending' | 'succeeded' | 'failed';
export type PayoutReason = 'release' | 'refund';
export type PayoutStatus = 'queued' | 'paid' | 'failed';
export type VerificationStatus = 'awaiting_payment' | 'pending' | 'approved' | 'rejected';
export type ReviewStatus = 'published' | 'pending' | 'hidden';
export type Gender = 'female' | 'male';
export type RequestStatus = 'pending' | 'accepted' | 'declined';
export type ReportTarget = 'listing' | 'review' | 'user' | 'reservation';
export type ReportStatus = 'open' | 'resolved';
export type ReportAction = 'hide' | 'restore' | 'dismiss';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: Role;
          headline: string;
          campus: string | null;
          onboarded: boolean;
          is_admin: boolean;
          verified_at: string | null;
          created_at: string;
        };
        Insert: { [_ in never]: never };
        Update: {
          full_name?: string;
          role?: Role;
          headline?: string;
          campus?: string | null;
          onboarded?: boolean;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          user_id: string;
          whatsapp: string | null;
          payout_provider: Provider | null;
          payout_number: string | null;
        };
        Insert: { [_ in never]: never };
        Update: {
          whatsapp?: string | null;
          payout_provider?: Provider | null;
          payout_number?: string | null;
        };
        Relationships: [];
      };
      listings: {
        Row: {
          id: string;
          landlord_id: string;
          title: string;
          description: string;
          type_label: TypeLabel;
          category: RoomCategory;
          area: string;
          lat: number;
          lng: number;
          rent_ngwee: number;
          available_from: string;
          amenities: string[];
          status: ListingStatus;
          review_note: string | null;
          featured_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          description?: string;
          type_label: TypeLabel;
          area: string;
          lat: number;
          lng: number;
          rent_ngwee: number;
          available_from?: string;
          amenities?: string[];
        };
        Update: {
          title?: string;
          description?: string;
          type_label?: TypeLabel;
          area?: string;
          lat?: number;
          lng?: number;
          rent_ngwee?: number;
          available_from?: string;
          amenities?: string[];
        };
        Relationships: [];
      };
      listing_photos: {
        Row: { id: string; listing_id: string; path: string; position: number; created_at: string };
        Insert: { listing_id: string; path: string; position?: number };
        Update: { position?: number };
        Relationships: [];
      };
      saved_listings: {
        Row: { user_id: string; listing_id: string; created_at: string };
        Insert: { listing_id: string };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      reservations: {
        Row: {
          id: string;
          reference: string;
          listing_id: string;
          tenant_id: string;
          status: ReservationStatus;
          deposit_ngwee: number;
          booking_fee_ngwee: number;
          note: string | null;
          expires_at: string;
          held_at: string | null;
          released_at: string | null;
          refunded_at: string | null;
          created_at: string;
        };
        Insert: { [_ in never]: never };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      verifications: {
        Row: {
          id: string;
          landlord_id: string;
          status: VerificationStatus;
          nrc_front_path: string | null;
          nrc_back_path: string | null;
          selfie_path: string | null;
          ownership_path: string | null;
          rejection_reason: string | null;
          submitted_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          created_at: string;
        };
        Insert: {
          nrc_front_path?: string | null;
          nrc_back_path?: string | null;
          selfie_path?: string | null;
          ownership_path?: string | null;
        };
        Update: {
          nrc_front_path?: string | null;
          nrc_back_path?: string | null;
          selfie_path?: string | null;
          ownership_path?: string | null;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          id: string;
          user_id: string;
          kind: PaymentKind;
          amount_ngwee: number;
          provider: Provider;
          phone: string;
          status: PaymentStatus;
          mode: PaymentsMode;
          provider_ref: string | null;
          reservation_id: string | null;
          listing_id: string | null;
          verification_id: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: { [_ in never]: never };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      payouts: {
        Row: {
          id: string;
          recipient_id: string;
          reservation_id: string | null;
          reason: PayoutReason;
          amount_ngwee: number;
          provider: Provider | null;
          number: string | null;
          status: PayoutStatus;
          mode: PaymentsMode;
          created_at: string;
          paid_at: string | null;
        };
        Insert: { [_ in never]: never };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          listing_id: string;
          reservation_id: string;
          tenant_id: string;
          rating: number;
          body: string;
          status: ReviewStatus;
          created_at: string;
        };
        Insert: { [_ in never]: never };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      roommate_profiles: {
        Row: {
          user_id: string;
          campus: string;
          budget_min_ngwee: number;
          budget_max_ngwee: number;
          move_in_month: string;
          habits: string[];
          gender: Gender | null;
          same_gender_only: boolean;
          bio: string;
          visible: boolean;
          updated_at: string;
        };
        Insert: {
          campus: string;
          budget_min_ngwee: number;
          budget_max_ngwee: number;
          move_in_month: string;
          habits?: string[];
          gender?: Gender | null;
          same_gender_only?: boolean;
          bio?: string;
          visible?: boolean;
        };
        Update: {
          campus?: string;
          budget_min_ngwee?: number;
          budget_max_ngwee?: number;
          move_in_month?: string;
          habits?: string[];
          gender?: Gender | null;
          same_gender_only?: boolean;
          bio?: string;
          visible?: boolean;
        };
        Relationships: [];
      };
      roommate_requests: {
        Row: {
          id: string;
          from_user: string;
          to_user: string;
          status: RequestStatus;
          created_at: string;
          responded_at: string | null;
        };
        Insert: { to_user: string };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      ads: {
        Row: {
          id: string;
          business_name: string;
          headline: string;
          body: string;
          cta_label: string;
          cta_url: string | null;
          image_path: string | null;
          areas: string[];
          starts_on: string;
          ends_on: string | null;
          active: boolean;
          clicks: number;
          created_at: string;
        };
        Insert: {
          business_name: string;
          headline: string;
          body?: string;
          cta_label?: string;
          cta_url?: string | null;
          image_path?: string | null;
          areas?: string[];
          starts_on?: string;
          ends_on?: string | null;
          active?: boolean;
        };
        Update: {
          business_name?: string;
          headline?: string;
          body?: string;
          cta_label?: string;
          cta_url?: string | null;
          image_path?: string | null;
          areas?: string[];
          starts_on?: string;
          ends_on?: string | null;
          active?: boolean;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_type: ReportTarget;
          target_id: string;
          reason: string;
          note: string;
          status: ReportStatus;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: { target_type: ReportTarget; target_id: string; reason: string; note?: string };
        Update: { [_ in never]: never };
        Relationships: [];
      };
      app_settings: {
        Row: {
          id: number;
          deposit_ngwee: number;
          booking_fee_ngwee: number;
          listing_fee_ngwee: number;
          feature_fee_ngwee: number;
          feature_days: number;
          verification_fee_ngwee: number;
          payments_mode: PaymentsMode;
          banned_words: string[];
          updated_at: string;
        };
        Insert: { [_ in never]: never };
        Update: {
          deposit_ngwee?: number;
          booking_fee_ngwee?: number;
          listing_fee_ngwee?: number;
          feature_fee_ngwee?: number;
          feature_days?: number;
          verification_fee_ngwee?: number;
          banned_words?: string[];
        };
        Relationships: [];
      };
    };
    Views: {
      listing_cards: {
        Row: {
          id: string;
          landlord_id: string;
          title: string;
          description: string;
          type_label: TypeLabel;
          category: RoomCategory;
          area: string;
          lat: number;
          lng: number;
          rent_ngwee: number;
          available_from: string;
          amenities: string[];
          status: ListingStatus;
          featured_until: string | null;
          created_at: string;
          updated_at: string;
          landlord_name: string;
          landlord_verified: boolean;
          landlord_since: string;
          cover_path: string | null;
          photo_count: number;
          avg_rating: number | null;
          review_count: number;
          is_featured: boolean;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      is_landlord: { Args: Record<string, never>; Returns: boolean };
      create_reservation: {
        Args: { p_listing_id: string; p_provider: Provider; p_phone: string };
        Returns: Json; // { reservation_id, payment_id, reference, amount_ngwee, expires_at }
      };
      start_payment: {
        Args: { p_kind: Exclude<PaymentKind, 'reservation'>; p_target_id: string; p_provider: Provider; p_phone: string };
        Returns: Json; // { payment_id, amount_ngwee }
      };
      simulate_payment: {
        Args: { p_payment_id: string; p_approve: boolean };
        Returns: Json; // { status, kind, reference?, reservation_status?, listing_status?, problems?, featured_until?, verification_status? }
      };
      confirm_move_in: { Args: { p_reservation_id: string }; Returns: Json };
      cancel_reservation: { Args: { p_reservation_id: string; p_reason: string }; Returns: Json };
      get_landlord_contact: { Args: { p_listing_id: string }; Returns: string | null };
      get_roommate_contact: { Args: { p_user_id: string }; Returns: string | null };
      respond_roommate_request: { Args: { p_request_id: string; p_accept: boolean }; Returns: RequestStatus };
      submit_review: {
        Args: { p_reservation_id: string; p_rating: number; p_body: string };
        Returns: Extract<ReviewStatus, 'published' | 'pending'>;
      };
      check_listing: { Args: { p_listing_id: string }; Returns: string[] };
      review_verification: {
        Args: { p_id: string; p_approve: boolean; p_reason?: string };
        Returns: Extract<VerificationStatus, 'approved' | 'rejected'>;
      };
      review_listing: {
        Args: { p_id: string; p_approve: boolean; p_reason?: string };
        Returns: Extract<ListingStatus, 'live' | 'rejected'>;
      };
      resolve_report: { Args: { p_id: string; p_action: ReportAction }; Returns: ReportAction };
      track_ad_click: { Args: { p_ad_id: string }; Returns: undefined };
      my_reservations: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          reference: string;
          status: Extract<ReservationStatus, 'held' | 'released' | 'refunded'>;
          deposit_ngwee: number;
          booking_fee_ngwee: number;
          note: string | null;
          created_at: string;
          held_at: string | null;
          released_at: string | null;
          refunded_at: string | null;
          listing_id: string;
          listing_title: string;
          listing_area: string;
          listing_status: ListingStatus;
          landlord_name: string;
          has_review: boolean;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database['public'];
export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row'];
export type Views<T extends keyof PublicSchema['Views']> = PublicSchema['Views'][T]['Row'];
export type AppSettings = Tables<'app_settings'>;
export type ListingCard = Views<'listing_cards'>;
