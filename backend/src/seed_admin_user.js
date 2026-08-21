const bcrypt = require('bcryptjs');
const supabase = require('./config/supabase');

async function seedAdminUser() {
  console.log('Connecting to Supabase REST API. Creating Admin Account...');

  try {
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    const email = 'admin@chaudhary.com';
    const phone = '7897837095';
    const fullName = 'Akash Chaudhary';

    // 1. Delete existing admin user if any
    await supabase.from('users').delete().or(`phone.eq.${phone},email.eq.${email}`);

    // 2. Insert main Admin User
    const { data: adminUser, error: insertErr } = await supabase
      .from('users')
      .insert([{
        full_name: fullName,
        phone,
        email,
        password_hash: hashedPassword,
        is_active: true
      }])
      .select()
      .single();

    if (insertErr || !adminUser) {
      console.error('Error inserting admin user:', insertErr);
      return;
    }

    console.log('Created Admin User:', adminUser);

    // 3. Ensure ADMIN role exists in roles table
    let { data: adminRole } = await supabase.from('roles').select('id').eq('name', 'ADMIN').single();
    if (!adminRole) {
      const { data: newRole } = await supabase.from('roles').insert([{ name: 'ADMIN', description: 'Administrator' }]).select().single();
      adminRole = newRole;
    }

    // 4. Attach ADMIN role to user in user_roles table
    if (adminRole) {
      await supabase.from('user_roles').insert([{
        user_id: adminUser.id,
        role_id: adminRole.id
      }]);
    }

    console.log('✅ Admin Account created successfully in Supabase via REST API!');
    console.log('   Email: admin@chaudhary.com');
    console.log('   Phone: 7897837095');
    console.log('   Password: Admin@123');
  } catch (err) {
    console.error('Error seeding admin user:', err.message);
  }
}

seedAdminUser();
