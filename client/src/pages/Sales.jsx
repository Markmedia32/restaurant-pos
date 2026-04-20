import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Calendar, 
    DollarSign, 
    TrendingUp, 
    Package, 
    ChevronRight, 
    Search, 
    Download, 
    Filter, 
    RefreshCcw, 
    ArrowUpRight, 
    ArrowDownRight, 
    Clock, 
    ChevronLeft,
    MoreHorizontal
} from 'lucide-react';
import API_BASE_URL from '../config';

const Sales = () => {
    const [salesData, setSalesData] = useState([]);
    const [stats, setStats] = useState({ 
        totalRevenue: 0, 
        totalOrders: 0, 
        avgTicket: 0,
        growth: 12.5 // Hardcoded as per your original UI mockup
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('today');
    const [selectedSale, setSelectedSale] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    useEffect(() => {
        fetchSales();
    }, [filterDate]);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/sales?period=${filterDate}`);
            const data = res.data || [];
            
            // PostgreSQL/Neon safety: Force numeric strings to actual Numbers for math
            const total = data.reduce((acc, sale) => acc + Number(sale.total_amount || 0), 0);
            
            setSalesData(data);
            setStats({
                ...stats,
                totalRevenue: total,
                totalOrders: data.length,
                avgTicket: data.length > 0 ? (total / data.length) : 0
            });
        } catch (err) {
            console.error("Critical: Sales fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredSales = salesData.filter(sale => 
        (sale.client_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sale.id?.toString() || "").includes(searchTerm) ||
        (sale.payment_method || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleViewDetails = (sale) => {
        setSelectedSale(sale);
        setShowDetailModal(true);
    };

    return (
        <div className="sales-analytics-page" style={{ padding: '25px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            {/* --- HEADER SECTION --- */}
            <header className="inventory-header" style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ backgroundColor: '#0071e3', padding: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TrendingUp size={24} color="#fff" />
                        </div>
                        Sales Intelligence
                    </h1>
                    <p className="inventory-subtitle" style={{ color: '#666', marginTop: '4px' }}>
                        Real-time revenue monitoring & order reconciliation
                    </p>
                </div>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div className="filter-group" style={{ backgroundColor: '#fff', padding: '4px 12px', borderRadius: '10px', border: '1px solid #e0e0e0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Filter size={16} color="#666" />
                        <select 
                            value={filterDate} 
                            onChange={(e) => setFilterDate(e.target.value)}
                            style={{ border: 'none', outline: 'none', padding: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
                        >
                            <option value="today">Today's Activity</option>
                            <option value="yesterday">Yesterday</option>
                            <option value="this_week">Weekly Performance</option>
                            <option value="this_month">Monthly Overview</option>
                        </select>
                    </div>
                    
                    <button className="btn-outline" onClick={fetchSales} style={{ backgroundColor: '#fff', borderRadius: '10px', padding: '0 15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <RefreshCcw size={16} className={loading ? 'spin' : ''} /> 
                        Sync
                    </button>
                    
                    <button className="btn-primary" style={{ borderRadius: '10px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Download size={16} /> Export
                    </button>
                </div>
            </header>

            {/* --- TOP ANALYTICS CARDS --- */}
            <div className="recon-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
                <div className="audit-card" style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '18px', border: '1px solid #eef0f2', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <div style={{ backgroundColor: '#e7f3ff', padding: '10px', borderRadius: '12px' }}>
                            <DollarSign color="#0071e3" size={24} />
                        </div>
                        <span style={{ color: '#2a9d8f', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center' }}>
                            <ArrowUpRight size={14} /> +{stats.growth}%
                        </span>
                    </div>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#888', fontWeight: '500' }}>Gross Revenue</h4>
                    <p style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#1d1d1f' }}>
                        Ksh {stats.totalRevenue.toLocaleString()}
                    </p>
                </div>

                <div className="audit-card" style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '18px', border: '1px solid #eef0f2', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <div style={{ backgroundColor: '#fff4e5', padding: '10px', borderRadius: '12px' }}>
                            <Package color="#f5a623" size={24} />
                        </div>
                    </div>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#888', fontWeight: '500' }}>Orders Processed</h4>
                    <p style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#1d1d1f' }}>{stats.totalOrders}</p>
                </div>

                <div className="audit-card" style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '18px', border: '1px solid #eef0f2', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <div style={{ backgroundColor: '#e6fffa', padding: '10px', borderRadius: '12px' }}>
                            <Calendar color="#2a9d8f" size={24} />
                        </div>
                    </div>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#888', fontWeight: '500' }}>Average Transaction</h4>
                    <p style={{ margin: 0, fontSize: '24px', fontWeight: '800', color: '#1d1d1f' }}>
                        Ksh {Math.round(stats.avgTicket).toLocaleString()}
                    </p>
                </div>

                <div className="audit-card" style={{ backgroundColor: '#1d1d1f', padding: '20px', borderRadius: '18px', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: '10px', borderRadius: '12px' }}>
                            <Clock color="#fff" size={24} />
                        </div>
                    </div>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '14px', color: '#aaa', fontWeight: '400' }}>Last Sync</h4>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#fff' }}>
                        Just Now
                    </p>
                    <div style={{ marginTop: '10px', height: '4px', backgroundColor: '#333', borderRadius: '2px' }}>
                        <div style={{ width: '100%', height: '100%', backgroundColor: '#0071e3', borderRadius: '2px' }}></div>
                    </div>
                </div>
            </div>

            {/* --- MAIN CONTENT AREA --- */}
            <div className="stock-container" style={{ backgroundColor: '#fff', borderRadius: '20px', padding: '0', overflow: 'hidden', border: '1px solid #eef0f2' }}>
                <div className="stock-table-header" style={{ padding: '20px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Detailed Order Log</h3>
                    <div className="pos-search-bar" style={{ width: '350px', marginBottom: 0, backgroundColor: '#f5f5f7', border: 'none', borderRadius: '10px', padding: '8px 15px' }}>
                        <Search size={18} color="#888" />
                        <input 
                            type="text" 
                            placeholder="Search client, payment method, or ID..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ background: 'transparent', border: 'none', outline: 'none', marginLeft: '10px', width: '100%', fontSize: '14px' }}
                        />
                    </div>
                </div>

                {loading ? (
                    <div style={{ padding: '100px 0', textAlign: 'center', color: '#888' }}>
                        <RefreshCcw size={40} className="spin" style={{ marginBottom: '15px', opacity: 0.5 }} />
                        <p style={{ fontWeight: '500' }}>Fetching live data from Neon DB...</p>
                    </div>
                ) : (
                    <table className="inventory-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: '#f9f9fb' }}>
                            <tr>
                                <th style={{ padding: '15px 25px', textAlign: 'left', color: '#666', fontSize: '13px', fontWeight: '600' }}>Ref ID</th>
                                <th style={{ padding: '15px 25px', textAlign: 'left', color: '#666', fontSize: '13px', fontWeight: '600' }}>Time Stamp</th>
                                <th style={{ padding: '15px 25px', textAlign: 'left', color: '#666', fontSize: '13px', fontWeight: '600' }}>Customer</th>
                                <th style={{ padding: '15px 25px', textAlign: 'left', color: '#666', fontSize: '13px', fontWeight: '600' }}>Method</th>
                                <th style={{ padding: '15px 25px', textAlign: 'left', color: '#666', fontSize: '13px', fontWeight: '600' }}>Gross Amount</th>
                                <th style={{ padding: '15px 25px', textAlign: 'right', color: '#666', fontSize: '13px', fontWeight: '600' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSales.length > 0 ? (
                                filteredSales.map((sale) => (
                                    <tr key={sale.id} style={{ borderBottom: '1px solid #f5f5f7' }}>
                                        <td style={{ padding: '18px 25px' }}>
                                            <span style={{ color: '#0071e3', fontWeight: '700', fontSize: '14px' }}>#PF-{sale.id}</span>
                                        </td>
                                        <td style={{ padding: '18px 25px', color: '#444', fontSize: '14px' }}>
                                            {new Date(sale.created_at).toLocaleString('en-GB', {
                                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                        <td style={{ padding: '18px 25px', fontWeight: '600', color: '#1d1d1f' }}>
                                            {sale.client_name || "Walk-in Customer"}
                                        </td>
                                        <td style={{ padding: '18px 25px' }}>
                                            <span style={{ 
                                                padding: '4px 10px', 
                                                borderRadius: '6px', 
                                                fontSize: '12px', 
                                                fontWeight: '700',
                                                backgroundColor: sale.payment_method === 'M-Pesa' ? '#e1f5fe' : '#f0f0f0',
                                                color: sale.payment_method === 'M-Pesa' ? '#0288d1' : '#666'
                                            }}>
                                                {sale.payment_method.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '18px 25px', fontWeight: '800', fontSize: '15px' }}>
                                            Ksh {Number(sale.total_amount).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '18px 25px', textAlign: 'right' }}>
                                            <button 
                                                className="btn-outline" 
                                                onClick={() => handleViewDetails(sale)}
                                                style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600' }}
                                            >
                                                Details <ChevronRight size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '60px 0' }}>
                                        <div style={{ opacity: 0.4 }}>
                                            <Package size={48} style={{ marginBottom: '10px' }} />
                                            <p>No transaction history found for this period.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* --- FOOTER BRANDING --- */}
            <footer className="inventory-footer" style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', color: '#888' }}>System Status: </span>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2a9d8f' }}></div>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#2a9d8f' }}>Neon DB Connected</span>
                </div>
                <span className="branding-tag" style={{ color: '#aaa', fontSize: '12px' }}>Property Flow v2.4 • Codey Craft Africa</span>
            </footer>

            {/* --- DETAIL MODAL --- */}
            {showDetailModal && selectedSale && (
                <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content" style={{ backgroundColor: '#fff', width: '450px', borderRadius: '24px', padding: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>Order Details</h3>
                            <button onClick={() => setShowDetailModal(false)} style={{ border: 'none', background: '#f5f5f7', borderRadius: '50%', padding: '5px', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        
                        <div style={{ backgroundColor: '#f9f9fb', borderRadius: '15px', padding: '20px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ color: '#666' }}>Order Reference:</span>
                                <span style={{ fontWeight: '700' }}>#PF-{selectedSale.id}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ color: '#666' }}>Customer Name:</span>
                                <span style={{ fontWeight: '700' }}>{selectedSale.client_name}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span style={{ color: '#666' }}>Payment Method:</span>
                                <span style={{ fontWeight: '700' }}>{selectedSale.payment_method}</span>
                            </div>
                            <div style={{ borderTop: '1px dashed #ddd', margin: '15px 0', paddingTop: '15px', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontWeight: '800', fontSize: '18px' }}>Total Amount:</span>
                                <span style={{ fontWeight: '800', fontSize: '18px', color: '#0071e3' }}>Ksh {Number(selectedSale.total_amount).toLocaleString()}</span>
                            </div>
                        </div>

                        <button className="btn-primary" style={{ width: '100%', padding: '15px', borderRadius: '12px', fontWeight: '700' }} onClick={() => window.print()}>
                            Reprint Receipt
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sales;