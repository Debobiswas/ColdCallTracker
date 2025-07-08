export default async function handler(req, res) {
  // Enable CORS for the frontend domain
  const origin = req.headers.origin
  if (origin && origin.includes('vercel.app')) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
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

    if (req.method === 'GET') {
      // Get all businesses for the authenticated user
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Database error:', error)
        return res.status(500).json({ error: error.message })
      }

      return res.status(200).json(data)
    }

    if (req.method === 'POST') {
      // Check if this is a bulk upload request
      if (Array.isArray(req.body)) {
        // BULK UPLOAD ENDPOINT
        const businesses = req.body
        
        if (businesses.length === 0) {
          return res.status(400).json({ error: 'No businesses provided' })
        }

        console.log(`Processing bulk upload of ${businesses.length} businesses for user ${userId}`)

        // Process and validate businesses with flexible field mapping
        const processedBusinesses = businesses.map((business) => {
          // Extract business name from various possible field names
          const businessName = business.name || business.business_name || business.title || business.place_name || ''
          
          // Extract other fields with flexible mapping (using correct database column names)
          const processedBusiness = {
            name: businessName,
            phone: business.phone || business.phone_number || business.contact_phone || business.phoneUnformatted || '',
            address: business.address || business.full_address || business.location || business.formatted_address || '',
            region: business.city || business.region || business.location || '',
            industry: business.industry || business.category || business.categoryName || business.business_type || (business.types && business.types[0]) || '',
            hours: business.hours || business.openingHours || business.opening_hours || business.business_hours || '',
            comments: business.description || business.about || business.summary || '',
            user_id: userId,
            status: business.status || 'new',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          return processedBusiness
        }).filter(business => business.name && business.name.trim())

        if (processedBusinesses.length === 0) {
          return res.status(400).json({ error: 'No valid businesses found' })
        }

        // Remove duplicates based on phone number for this user
        const uniqueBusinesses = []
        const seenPhones = new Set()
        
        for (const business of processedBusinesses) {
          const phone = business.phone?.trim() || ''
          if (phone === '' || !seenPhones.has(phone)) {
            uniqueBusinesses.push(business)
            if (phone !== '') {
              seenPhones.add(phone)
            }
          }
        }

        console.log(`After deduplication: ${uniqueBusinesses.length} unique businesses`)

        // Bulk insert all businesses at once
        const { data, error } = await supabase
          .from('businesses')
          .insert(uniqueBusinesses)
          .select()

        if (error) {
          console.error('Bulk insert error:', error)
          return res.status(400).json({ 
            error: 'Failed to insert businesses',
            details: error.message,
            processed: processedBusinesses.length,
            unique: uniqueBusinesses.length
          })
        }

        return res.status(201).json({
          message: `Successfully uploaded ${data.length} businesses`,
          total_received: businesses.length,
          total_processed: processedBusinesses.length,
          total_unique: uniqueBusinesses.length,
          total_inserted: data.length,
          businesses: data
        })

      } else {
        // SINGLE BUSINESS ENDPOINT
        const businessData = req.body

        // Add user_id and default values
        const newBusiness = {
          ...businessData,
          user_id: userId,
          status: businessData.status || 'new',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        const { data, error } = await supabase
          .from('businesses')
          .insert([newBusiness])
          .select()

        if (error) {
          console.error('Database error:', error)
          return res.status(400).json({ error: error.message })
        }

        return res.status(201).json(data[0])
      }
    }

    res.setHeader('Allow', ['GET', 'POST', 'OPTIONS'])
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