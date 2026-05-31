export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          company_name: string | null
          nif: string | null
          address: string | null
          postal_code: string | null
          city: string | null
          province: string | null
          country: string
          phone: string | null
          email: string | null
          bank_account: string | null
          logo_url: string | null
          invoice_prefix: string
          last_invoice_no: number
          subscription_tier: string
          verifactu_enabled: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          company_name?: string | null
          nif?: string | null
          address?: string | null
          postal_code?: string | null
          city?: string | null
          province?: string | null
          country?: string
          phone?: string | null
          email?: string | null
          bank_account?: string | null
          logo_url?: string | null
          invoice_prefix?: string
          last_invoice_no?: number
          subscription_tier?: string
          verifactu_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_name?: string | null
          nif?: string | null
          address?: string | null
          postal_code?: string | null
          city?: string | null
          province?: string | null
          country?: string
          phone?: string | null
          email?: string | null
          bank_account?: string | null
          logo_url?: string | null
          invoice_prefix?: string
          last_invoice_no?: number
          subscription_tier?: string
          verifactu_enabled?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      clients: {
        Row: {
          id: string
          profile_id: string
          company_name: string
          nif: string
          address: string | null
          postal_code: string | null
          city: string | null
          province: string | null
          country: string
          email: string | null
          phone: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          company_name: string
          nif: string
          address?: string | null
          postal_code?: string | null
          city?: string | null
          province?: string | null
          country?: string
          email?: string | null
          phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          company_name?: string
          nif?: string
          address?: string | null
          postal_code?: string | null
          city?: string | null
          province?: string | null
          country?: string
          email?: string | null
          phone?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      products_services: {
        Row: {
          id: string
          profile_id: string
          name: string
          description: string | null
          type: 'product' | 'service'
          unit_price: number
          unit: string
          tax_type: string
          iva_percent: number
          irpf_percent: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          name: string
          description?: string | null
          type: 'product' | 'service'
          unit_price?: number
          unit?: string
          tax_type?: string
          iva_percent?: number
          irpf_percent?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          name?: string
          description?: string | null
          type?: 'product' | 'service'
          unit_price?: number
          unit?: string
          tax_type?: string
          iva_percent?: number
          irpf_percent?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          profile_id: string
          client_id: string
          invoice_number: string
          invoice_type: string
          series: string
          issue_date: string
          operation_date: string
          due_date: string | null
          subtotal: number
          iva_total: number
          irpf_total: number
          discount_total: number
          grand_total: number
          status: 'draft' | 'sent' | 'paid' | 'cancelled' | 'rectified'
          paid_at: string | null
          notes: string | null
          terms: string | null
          currency: string
          language: string
          verifactu_hash: string | null
          verifactu_prev_hash: string | null
          verifactu_signature: string | null
          verifactu_qr: string | null
          verifactu_status: 'pending' | 'signed' | 'submitted' | 'acknowledged' | 'rejected'
          verifactu_submitted_at: string | null
          verifactu_response: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          client_id: string
          invoice_number: string
          invoice_type?: string
          series?: string
          issue_date?: string
          operation_date?: string
          due_date?: string | null
          subtotal?: number
          iva_total?: number
          irpf_total?: number
          discount_total?: number
          grand_total?: number
          status?: 'draft' | 'sent' | 'paid' | 'cancelled' | 'rectified'
          paid_at?: string | null
          notes?: string | null
          terms?: string | null
          currency?: string
          language?: string
          verifactu_hash?: string | null
          verifactu_prev_hash?: string | null
          verifactu_signature?: string | null
          verifactu_qr?: string | null
          verifactu_status?: 'pending' | 'signed' | 'submitted' | 'acknowledged' | 'rejected'
          verifactu_submitted_at?: string | null
          verifactu_response?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          client_id?: string
          invoice_number?: string
          invoice_type?: string
          series?: string
          issue_date?: string
          operation_date?: string
          due_date?: string | null
          subtotal?: number
          iva_total?: number
          irpf_total?: number
          discount_total?: number
          grand_total?: number
          status?: 'draft' | 'sent' | 'paid' | 'cancelled' | 'rectified'
          paid_at?: string | null
          notes?: string | null
          terms?: string | null
          currency?: string
          language?: string
          verifactu_hash?: string | null
          verifactu_prev_hash?: string | null
          verifactu_signature?: string | null
          verifactu_qr?: string | null
          verifactu_status?: 'pending' | 'signed' | 'submitted' | 'acknowledged' | 'rejected'
          verifactu_submitted_at?: string | null
          verifactu_response?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          product_id: string | null
          description: string
          quantity: number
          unit_price: number
          discount_pct: number
          iva_percent: number
          irpf_percent: number
          line_total: number
          iva_amount: number
          irpf_amount: number
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          product_id?: string | null
          description: string
          quantity?: number
          unit_price?: number
          discount_pct?: number
          iva_percent?: number
          irpf_percent?: number
          line_total?: number
          iva_amount?: number
          irpf_amount?: number
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          product_id?: string | null
          description?: string
          quantity?: number
          unit_price?: number
          discount_pct?: number
          iva_percent?: number
          irpf_percent?: number
          line_total?: number
          iva_amount?: number
          irpf_amount?: number
          sort_order?: number
          created_at?: string
        }
      }
      invoice_taxes: {
        Row: {
          id: string
          invoice_id: string
          tax_type: 'iva' | 'irpf'
          tax_percent: number
          taxable_base: number
          tax_amount: number
        }
        Insert: {
          id?: string
          invoice_id: string
          tax_type: 'iva' | 'irpf'
          tax_percent: number
          taxable_base?: number
          tax_amount?: number
        }
        Update: {
          id?: string
          invoice_id?: string
          tax_type?: 'iva' | 'irpf'
          tax_percent?: number
          taxable_base?: number
          tax_amount?: number
        }
      }
      verifactu_certificates: {
        Row: {
          id: string
          profile_id: string
          alias: string
          issuer: string | null
          subject: string | null
          serial_number: string | null
          valid_from: string | null
          valid_until: string | null
          certificate_url: string | null
          certificate_password_encrypted: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          alias: string
          issuer?: string | null
          subject?: string | null
          serial_number?: string | null
          valid_from?: string | null
          valid_until?: string | null
          certificate_url?: string | null
          certificate_password_encrypted?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          alias?: string
          issuer?: string | null
          subject?: string | null
          serial_number?: string | null
          valid_from?: string | null
          valid_until?: string | null
          certificate_url?: string | null
          certificate_password_encrypted?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      verifactu_submissions: {
        Row: {
          id: string
          invoice_id: string
          profile_id: string
          submission_type: string
          xml_payload: string | null
          submitted_at: string
          response_status: string | null
          response_code: string | null
          response_body: Json | null
          csr: string | null
          retry_count: number
          last_error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          profile_id: string
          submission_type: string
          xml_payload?: string | null
          submitted_at?: string
          response_status?: string | null
          response_code?: string | null
          response_body?: Json | null
          csr?: string | null
          retry_count?: number
          last_error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          profile_id?: string
          submission_type?: string
          xml_payload?: string | null
          submitted_at?: string
          response_status?: string | null
          response_code?: string | null
          response_body?: Json | null
          csr?: string | null
          retry_count?: number
          last_error?: string | null
          created_at?: string
        }
      }
      verifactu_chain: {
        Row: {
          id: string
          profile_id: string
          invoice_id: string
          invoice_number: string
          prev_chain_id: string | null
          prev_hash: string | null
          hash_algorithm: string
          hash_value: string
          signature_value: string | null
          signature_algorithm: string
          qr_data: string | null
          chain_position: number
          chain_ref: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          invoice_id: string
          invoice_number: string
          prev_chain_id?: string | null
          prev_hash?: string | null
          hash_algorithm?: string
          hash_value: string
          signature_value?: string | null
          signature_algorithm?: string
          qr_data?: string | null
          chain_position: number
          chain_ref?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          invoice_id?: string
          invoice_number?: string
          prev_chain_id?: string | null
          prev_hash?: string | null
          hash_algorithm?: string
          hash_value?: string
          signature_value?: string | null
          signature_algorithm?: string
          qr_data?: string | null
          chain_position?: number
          chain_ref?: string | null
          created_at?: string
        }
      }
    }
  }
}
