/*
╔══════════════════════════════════════════════════════════════════╗
║  JNK GENERAL TRADING LLC - Sales & Inventory Management System      ║
║                                                                  ║
║  Crafted with Excellence by: MAZHAR RONY                     ║
║  "Building tomorrow's business solutions today"               ║
║                                                                  ║
║  Connect: hello@meetmazhar.site | Portfolio: www.meetmazhar.site  ║
╚══════════════════════════════════════════════════════════════════╝
*/

import { supabase } from "@/integrations/client";

/**
 * Initialize database tables and ensure admin user setup
 */
export const initializeDatabase = async () => {
  try {
    console.log("Initializing database tables...");
    
    // Ensure kamal@jnknutrition.com has admin role
    const { data: adminRole, error: adminError } = await supabase
      .from('user_roles')
      .upsert(
        {
          email: 'kamal@jnknutrition.com',
          role: 'admin',
          is_active: true
        } as any,
        {
          onConflict: 'email'
        }
      )
      .select();

    if (adminError) {
      console.error('Error setting up admin role:', adminError);
    } else {
      console.log('Admin role ensured:', adminRole);
    }

    // Try to create a test profile to see if the table exists
    const { error: profileTestError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (profileTestError && profileTestError.message?.includes('does not exist')) {
      console.log('Profiles table does not exist - needs manual creation');
      return {
        success: false,
        message: 'Profiles table needs to be created manually'
      };
    }

    console.log('Database initialization completed successfully');
    return {
      success: true,
      message: 'Database tables are ready'
    };

  } catch (error) {
    console.error('Database initialization error:', error);
    return {
      success: false,
      message: 'Database initialization failed',
      error
    };
  }
};

/**
 * Check if current user is admin by email
 */
export const checkAdminStatus = async (email: string | undefined) => {
  if (!email) return false;
  
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role, is_active')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return (data && (data as any).role === 'admin') || false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};