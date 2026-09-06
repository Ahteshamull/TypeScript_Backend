import mongoose from 'mongoose';
import dns from 'dns';
import config from './index';

// Configure DNS servers and IPv4 preference to prevent SRV lookup timeouts (querySrv ENOTFOUND)
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch {
  // Graceful fallback if runtime environment restricts custom DNS server 
}

const connectDB = async () => {
  try {
    if (!config.database_url) {
      console.error('Database URL is not defined in the environment variables.');
      process.exit(1);
    }
    await mongoose.connect(config.database_url, {
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB connected successfully with connection pooling');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

export default connectDB;
