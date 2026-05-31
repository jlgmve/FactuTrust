import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * FactuTrust — Invoice API
 * 
 * CRUD operations for Invoices, leveraging PostgreSQL RPCs for atomic
 * multi-table operations (header + items + taxes).
 */
serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase Client with the user's Auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: req.headers.get('Authorization')! } 
        } 
      }
    )

    const url = new URL(req.url)
    const id = url.searchParams.get('id')

    // --- ROUTE: GET /invoices ---
    // Fetches a single invoice with all details if ?id= is present,
    // otherwise lists all invoices for the authenticated user.
    if (req.method === 'GET') {
      if (id) {
        const { data, error } = await supabaseClient.rpc('get_invoice_full', { p_invoice_id: id })
        if (error) throw error
        if (!data) {
          return new Response(JSON.stringify({ error: 'Invoice not found' }), { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          })
        }
        
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      } else {
        const { data, error } = await supabaseClient
          .from('invoices')
          .select('*, client:clients(company_name, nif)')
          .order('issue_date', { ascending: false })
        
        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
    }

    // --- ROUTE: POST /invoices ---
    // Creates a new invoice with its line items and tax summary.
    // Body should match the arguments of create_invoice_full RPC.
    if (req.method === 'POST') {
      const body = await req.json()
      const { data, error } = await supabaseClient.rpc('create_invoice_full', body)
      if (error) throw error
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201,
      })
    }

    // --- ROUTE: PUT /invoices ---
    // Updates an existing invoice, replacing its items and taxes.
    // Body should match the arguments of update_invoice_full RPC.
    if (req.method === 'PUT') {
      const body = await req.json()
      const { data, error } = await supabaseClient.rpc('update_invoice_full', body)
      if (error) throw error
      
      return new Response(JSON.stringify({ success: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // --- ROUTE: DELETE /invoices ---
    // Deletes an invoice. Cascading deletes will handle items and taxes.
    if (req.method === 'DELETE') {
      if (!id) throw new Error('ID is required as a query parameter')
      
      const { error } = await supabaseClient
        .from('invoices')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response('Method not allowed', { status: 405 })

  } catch (error) {
    console.error(`[Invoice API Error]: ${error.message}`)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
