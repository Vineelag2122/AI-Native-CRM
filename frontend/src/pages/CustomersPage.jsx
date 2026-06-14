import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { customerAPI } from '../services/customerAPI';
import { orderAPI } from '../services/orderAPI';
import Sidebar from '../components/Sidebar';

const CustomersPage = () => {
  const { token } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    gender: '',
  });

  // Filter & Search & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [customerData, orderData] = await Promise.all([
        customerAPI.getAll(token),
        orderAPI.getAll(token),
      ]);
      setCustomers(customerData);
      setOrders(orderData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Map customer ID to set of product categories purchased
  const customerProductsMap = React.useMemo(() => {
    const map = {};
    orders.forEach((order) => {
      if (!map[order.customer_id]) {
        map[order.customer_id] = new Set();
      }
      if (order.product_category) {
        map[order.customer_id].add(order.product_category);
      }
    });
    return map;
  }, [orders]);

  // Unique product categories for selector
  const uniqueCategories = React.useMemo(() => {
    const categories = new Set();
    orders.forEach((order) => {
      if (order.product_category) {
        categories.add(order.product_category);
      }
    });
    return Array.from(categories).sort();
  }, [orders]);

  // Unique cities for selector
  const uniqueCities = React.useMemo(() => {
    return Array.from(new Set(customers.map((c) => c.city).filter(Boolean))).sort();
  }, [customers]);

  // Apply Search and Filters
  const filteredCustomers = React.useMemo(() => {
    return customers.filter((customer) => {
      // Search term match
      const nameMatch = customer.name.toLowerCase().includes(searchTerm.toLowerCase());
      const emailMatch = customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const phoneMatch = customer.phone?.includes(searchTerm) || false;
      const cityMatch = customer.city?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const matchesSearch = nameMatch || emailMatch || phoneMatch || cityMatch;

      // City filter match
      const matchesCity = !selectedCity || customer.city === selectedCity;

      // Gender filter match
      const matchesGender = !selectedGender || customer.gender === selectedGender;

      // Product category filter match
      let matchesCategory = true;
      if (selectedCategory) {
        const customerPurchases = customerProductsMap[customer.id];
        matchesCategory = customerPurchases ? customerPurchases.has(selectedCategory) : false;
      }

      return matchesSearch && matchesCity && matchesGender && matchesCategory;
    });
  }, [customers, searchTerm, selectedCity, selectedGender, selectedCategory, customerProductsMap]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCity, selectedGender, selectedCategory, itemsPerPage]);

  // Paginated customers
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCustomers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingId) {
        await customerAPI.update(editingId, formData, token);
      } else {
        await customerAPI.create(formData, token);
      }
      setFormData({ name: '', email: '', phone: '', city: '', gender: '' });
      setEditingId(null);
      setShowForm(false);
      fetchCustomers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (customer) => {
    setFormData(customer);
    setEditingId(customer.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await customerAPI.delete(id, token);
        fetchCustomers();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', email: '', phone: '', city: '', gender: '' });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      <Sidebar active="/customers" />
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Customers</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded transition"
            >
              {showForm ? 'Cancel' : 'Add Customer'}
            </button>
          </div>

          {/* Search and Filters Section */}
          <div className="bg-gray-800 p-5 rounded-lg border border-gray-700 mb-6 shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search Input */}
              <div className="md:col-span-2 relative">
                <input
                  type="text"
                  placeholder="Search by name, email, phone, city..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded px-4 py-2.5 pl-10 text-white placeholder-gray-400 transition outline-none"
                />
                <span className="absolute left-3.5 top-3 text-gray-400">
                  🔍
                </span>
              </div>

              {/* City Dropdown */}
              <div>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 focus:border-blue-500 rounded px-3 py-2.5 text-white transition outline-none"
                >
                  <option value="">All Cities</option>
                  {uniqueCities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Product Category Dropdown */}
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 focus:border-blue-500 rounded px-3 py-2.5 text-white transition outline-none"
                >
                  <option value="">All Categories (Purchased)</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between mt-4 pt-3 border-t border-gray-700 gap-3">
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Gender:</span>
                  <select
                    value={selectedGender}
                    onChange={(e) => setSelectedGender(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded px-2.5 py-1 text-sm text-white focus:border-blue-500 outline-none"
                  >
                    <option value="">All Genders</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {(searchTerm || selectedCity || selectedCategory || selectedGender) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCity('');
                    setSelectedCategory('');
                    setSelectedGender('');
                  }}
                  className="text-sm text-blue-400 hover:text-blue-300 font-medium transition flex items-center gap-1"
                >
                  ✕ Clear All Filters
                </button>
              )}
            </div>
          </div>

        {error && (
          <div className="mb-4 p-4 bg-red-900 text-red-100 rounded">
            {error}
          </div>
        )}

        {showForm && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">
              {editingId ? 'Edit Customer' : 'Add New Customer'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                name="name"
                placeholder="Name"
                value={formData.name}
                onChange={handleInputChange}
                className="bg-gray-700 px-4 py-2 rounded text-white"
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                className="bg-gray-700 px-4 py-2 rounded text-white"
                required
              />
              <input
                type="text"
                name="phone"
                placeholder="Phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="bg-gray-700 px-4 py-2 rounded text-white"
              />
              <input
                type="text"
                name="city"
                placeholder="City"
                value={formData.city}
                onChange={handleInputChange}
                className="bg-gray-700 px-4 py-2 rounded text-white"
              />
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="bg-gray-700 px-4 py-2 rounded text-white"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition"
                >
                  {editingId ? 'Update' : 'Add'} Customer
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            {customers.length === 0 ? 'No customers yet' : 'No customers match your filters'}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-lg">
              <table className="w-full">
                <thead className="bg-gray-700 text-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">Name</th>
                    <th className="px-6 py-3 text-left">Email</th>
                    <th className="px-6 py-3 text-left">Phone</th>
                    <th className="px-6 py-3 text-left">City</th>
                    <th className="px-6 py-3 text-left">Gender</th>
                    <th className="px-6 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {currentItems.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-750/50 transition duration-150">
                      <td className="px-6 py-3.5 font-medium text-white">{customer.name}</td>
                      <td className="px-6 py-3.5 text-gray-300">{customer.email}</td>
                      <td className="px-6 py-3.5 text-gray-400 font-mono text-sm">{customer.phone || '-'}</td>
                      <td className="px-6 py-3.5 text-gray-300">{customer.city || '-'}</td>
                      <td className="px-6 py-3.5 text-gray-400">{customer.gender || '-'}</td>
                      <td className="px-6 py-3.5 space-x-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
                          className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                <div className="text-sm text-gray-400">
                  Showing <span className="font-semibold text-white">{indexOfFirstItem + 1}</span> to{' '}
                  <span className="font-semibold text-white">
                    {Math.min(indexOfLastItem, filteredCustomers.length)}
                  </span>{' '}
                  of <span className="font-semibold text-white">{filteredCustomers.length}</span> customers
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:hover:bg-gray-700 text-white px-4 py-2 rounded transition text-sm font-medium"
                  >
                    ◀ Previous
                  </button>

                  <span className="text-sm text-gray-300 font-medium">
                    Page <span className="text-white font-semibold">{currentPage}</span> of{' '}
                    <span className="text-white font-semibold">{totalPages}</span>
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:hover:bg-gray-700 text-white px-4 py-2 rounded transition text-sm font-medium"
                  >
                    Next ▶
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">Show:</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(parseInt(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default CustomersPage;
