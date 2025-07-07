export default async function handler(req, res) {
  // Enable CORS for the frontend domain
  const origin = req.headers.origin
  if (origin && origin.includes('vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    // Check environment variables first
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_KEY

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        error: 'Missing environment variables',
        details: {
          supabaseUrl: supabaseUrl ? 'SET' : 'MISSING',
          supabaseKey: supabaseKey ? 'SET' : 'MISSING'
        }
      })
    }

    // Import Supabase client inside the try block
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get authenticated user from session
    let userId = null
    let user = null
    
    try {
      // Try to get user from Authorization header first
      const authHeader = req.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const { data: { user: bearerUser }, error } = await supabase.auth.getUser(token)
        if (bearerUser && !error) {
          userId = bearerUser.id
          user = bearerUser
        }
      }
      
      // If no bearer token, try to get from cookies
      if (!userId && req.headers.cookie) {
        const cookies = req.headers.cookie.split('; ').reduce((acc, cookie) => {
          const [key, value] = cookie.split('=')
          acc[key] = decodeURIComponent(value)
          return acc
        }, {})
        
        // Try different cookie names that Supabase might use
        const possibleTokens = [
          cookies['sb-access-token'],
          cookies['supabase-auth-token'],
          cookies['sb-auth-token']
        ].filter(Boolean)
        
        for (const token of possibleTokens) {
          try {
            const { data: { user: cookieUser }, error } = await supabase.auth.getUser(token)
            if (cookieUser && !error) {
              userId = cookieUser.id
              user = cookieUser
              break
            }
          } catch (e) {
            // Continue trying other tokens
          }
        }
      }
    } catch (authError) {
      console.log('Auth error:', authError.message)
    }

    // If still no user, use a default user ID for now (remove this in production)
    if (!userId) {
      userId = 'default-user-id'
      console.log('Warning: Using default user ID - implement proper authentication')
    }

    // Get business ID from URL parameters
    const { id: businessId } = req.query
    
    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' })
    }

    if (req.method === 'GET') {
      // Get a specific business
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Business not found' })
        }
        console.error('Database error:', error)
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json(data)
    }

        if (req.method === 'PUT' || req.method === 'PATCH') {
      // Update a business
      const updates = {
        ...req.body,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('businesses')
        .update(updates)
        .eq('id', businessId)
        .eq('user_id', userId)
        .select()

      if (error) {
        console.error('Database error:', error)
        return res.status(400).json({ error: error.message })
      }

      if (data.length === 0) {
        return res.status(404).json({ error: 'Business not found or unauthorized' })
      }

      return res.status(200).json(data[0])
    }

    if (req.method === 'DELETE') {
      // Delete a business - only allow users to delete their own businesses
      console.log(`Attempting to delete business ${businessId} for user ${userId}`)

      // First, check if the business exists and belongs to the user
      const { data: businessCheck, error: checkError } = await supabase
        .from('businesses')
        .select('id, name, user_id')
        .eq('id', businessId)
        .eq('user_id', userId)
        .single()

      if (checkError || !businessCheck) {
        console.error('Business not found or unauthorized:', checkError)
        return res.status(404).json({ error: 'Business not found or you do not have permission to delete it' })
      }

      // Check for related records that might prevent deletion
      const { data: relatedClients, error: clientsError } = await supabase
        .from('clients')
        .select('id')
        .eq('business_id', businessId)
        .eq('user_id', userId)

      const { data: relatedMeetings, error: meetingsError } = await supabase
        .from('meetings')
        .select('id')
        .eq('business_id', businessId)
        .eq('user_id', userId)

      // If there are related records, inform the user
      if (relatedClients && relatedClients.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete business with associated clients',
          details: `This business has ${relatedClients.length} associated client(s). Please remove or reassign clients before deleting.`
        })
      }

      if (relatedMeetings && relatedMeetings.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete business with scheduled meetings',
          details: `This business has ${relatedMeetings.length} scheduled meeting(s). Please complete or cancel meetings before deleting.`
        })
      }

      // Proceed with deletion
      const { data, error } = await supabase
        .from('businesses')
        .delete()
        .eq('id', businessId)
        .eq('user_id', userId)
        .select()

      if (error) {
        console.error('Database error:', error)
        return res.status(400).json({ error: error.message })
      }

      if (data.length === 0) {
        return res.status(404).json({ error: 'Business not found or unauthorized' })
      }

      console.log(`Successfully deleted business ${businessId} for user ${userId}`)
      return res.status(200).json({ 
        message: 'Business deleted successfully',
        deletedBusiness: data[0]
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error) {
    console.error('Server error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
} 