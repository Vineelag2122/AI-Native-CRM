import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { orderAPI } from '../services/orderAPI';
import { customerAPI } from '../services/customerAPI';
import Sidebar from '../components/Sidebar';

const OrdersPage = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    order_id_external: '',
    amount: '',
    order_date: '',
    product_category: '',
  });

  // Filter & Search & Pagination States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Map customer ID to customer details
  const customerMap = React.useMemo(() => {
    const map = {};
    customers.forEach((cust) => {
      map[cust.id] = cust;
    });
    return map;
  }, [customers]);

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
  const filteredOrders = React.useMemo(() => {
    return orders.filter((order) => {
      const customer = customerMap[order.customer_id] || {};
      
      // Search term match
      const orderIdMatch = order.order_id_external.toLowerCase().includes(searchTerm.toLowerCase());
      const customerNameMatch = order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const categoryMatch = order.product_category?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const emailMatch = customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const matchesSearch = orderIdMatch || customerNameMatch || categoryMatch || emailMatch;

      // City filter match
      const matchesCity = !selectedCity || customer.city === selectedCity;

      // Product category filter match
      const matchesCategory = !selectedCategory || order.product_category === selectedCategory;

      return matchesSearch && matchesCity && matchesCategory;
    });
  }, [orders, searchTerm, selectedCity, selectedCategory, customerMap]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCity, selectedCategory, itemsPerPage]);

  // Paginated orders
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orderAPI.getAll(token);
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchCustomers = useCallback(async () => {
    try {
      const data = await customerAPI.getAll(token);
      setCustomers(data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
  }, [fetchOrders, fetchCustomers]);

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
        await orderAPI.update(editingId, formData, token);
      } else {
        await orderAPI.create(formData, token);
      }
      setFormData({
        customer_id: '',
        order_id_external: '',
        amount: '',
        order_date: '',
        product_category: '',
      });
      setEditingId(null);
      setShowForm(false);
      fetchOrders();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (order) => {
    setFormData({
      customer_id: order.customer_id,
      order_id_external: order.order_id_external,
      amount: order.amount,
      order_date: order.order_date.split('T')[0],
      product_category: order.product_category,
    });
    setEditingId(order.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await orderAPI.delete(id, token);
        fetchOrders();
      } catch (err) {
        setError(err.message);
      }
    }
  };

  const handleCancel = () => {
    setFormData({
      customer_id: '',
      order_id_external: '',
      amount: '',
      order_date: '',
      product_category: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      <Sidebar active="/orders" />
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Orders</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded transition"
            >
              {showForm ? 'Cancel' : 'Add Order'}
            </button>
          </div>

          {/* Search and Filters Section */}
          <div className="bg-gray-800 p-5 rounded-lg border border-gray-700 mb-6 shadow-md">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search Input */}
              <div className="md:col-span-2 relative">
                <input
                  type="text"
                  placeholder="Search by order ID, customer name, email, category..."
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
                  <option value="">All Categories</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between mt-4 pt-3 border-t border-gray-700 gap-3">
              <div className="text-sm text-gray-400">
                Total Orders Found: <span className="font-semibold text-white">{filteredOrders.length}</span>
              </div>

              {(searchTerm || selectedCity || selectedCategory) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCity('');
                    setSelectedCategory('');
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
              {editingId ? 'Edit Order' : 'Add New Order'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                name="customer_id"
                value={formData.customer_id}
                onChange={handleInputChange}
                className="bg-gray-700 px-4 py-2 rounded text-white"
                required
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                name="order_id_external"
                placeholder="Order ID"
                value={formData.order_id_external}
                onChange={handleInputChange}
                className="bg-gray-700 px-4 py-2 rounded text-white"
                required
                disabled={!!editingId}
              />
              <input
                type="number"
                name="amount"
                placeholder="Amount"
                value={formData.amount}
                onChange={handleInputChange}
                className="bg-gray-700 px-4 py-2 rounded text-white"
                step="0.01"
                required
              />
              <input
                type="date"
                name="order_date"
                value={formData.order_date}
                onChange={handleInputChange}
                className="bg-gray-700 px-4 py-2 rounded text-white"
                required
              />
              <input
                type="text"
                name="product_category"
                placeholder="Product Category"
                value={formData.product_category}
                onChange={handleInputChange}
                className="bg-gray-700 px-4 py-2 rounded text-white"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded transition"
                >
                  {editingId ? 'Update' : 'Add'} Order
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
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            {orders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-lg">
              <table className="w-full">
                <thead className="bg-gray-700 text-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left">Order ID</th>
                    <th className="px-6 py-3 text-left">Customer</th>
                    <th className="px-6 py-3 text-left">Amount</th>
                    <th className="px-6 py-3 text-left">Category</th>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {currentItems.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-750/50 transition duration-150">
                      <td className="px-6 py-3.5 font-medium text-white font-mono text-sm">{order.order_id_external}</td>
                      <td className="px-6 py-3.5 text-gray-300">
                        <div>{order.customer_name}</div>
                        {customerMap[order.customer_id]?.city && (
                          <div className="text-xs text-gray-400">{customerMap[order.customer_id].city}</div>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-white font-semibold">₹{(Number(order.amount) || 0).toFixed(2)}</td>
                      <td className="px-6 py-3.5 text-gray-300">
                        <span className="bg-gray-700 text-gray-300 px-2.5 py-1 rounded-full text-xs font-medium border border-gray-600">
                          {order.product_category || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-gray-400 text-sm">
                        {new Date(order.order_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3.5 space-x-2">
                        <button
                          onClick={() => handleEdit(order)}
                          className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
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
                    {Math.min(indexOfLastItem, filteredOrders.length)}
                  </span>{' '}
                  of <span className="font-semibold text-white">{filteredOrders.length}</span> orders
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

export default OrdersPage;
