import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart3, Calendar, Download, Wallet, Receipt, 
  MinusCircle, Plus, PieChart 
} from 'lucide-react';

const Sales = () => {
  const [reportData, setReportData] = useState([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  
  // Expenses System
  const [expenses, setExpenses] = useState([]);
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  useEffect(() => {
    const fetchFinancialData = async () => {
      setLoading(true);
      try {
        // 1. Fetch Daily Itemized Sales
        const dailyRes = await axios.get(`http://localhost:5000/api/reports/sales-summary?date=${selectedDate}`);
        setReportData(dailyRes.data);

        // 2. Fetch Monthly Cumulative Revenue (Formatted for YYYY-MM)
        const monthYear = selectedDate.substring(0, 7); 
        const monthRes = await axios.get(`http://localhost:5000/api/reports/monthly-cumulative?month=${monthYear}`);

        if (monthRes.data && monthRes.data.total_revenue !== undefined) {
            // Ensure we are working with a clean number and ignoring pending/cancelled
            setMonthlyTotal(Number(monthRes.data.total_revenue) || 0);
        } else {
            setMonthlyTotal(0);
        }
      } catch (err) {
        console.error("Financial Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, [selectedDate]);

  // Financial Calculations for the "Cash at Hand" card
  const dailyRevenue = reportData.reduce((acc, item) => acc + (parseFloat(item.total_revenue) || 0), 0);
  const totalExpenses = expenses.reduce((acc, exp) => acc + (parseFloat(exp.amount) || 0), 0);
  const netCashAtHand = dailyRevenue - totalExpenses;

  // Expense Handlers
  const addExpense = () => {
    if (!expenseName || !expenseAmount) return;
    setExpenses([...expenses, { 
      id: Date.now(), 
      name: expenseName, 
      amount: expenseAmount 
    }]);
    setExpenseName('');
    setExpenseAmount('');
  };

  const removeExpense = (id) => {
    setExpenses(expenses.filter(exp => exp.id !== id));
  };

  return (
    <div className="sales-report-page">
      {/* --- PRINT SYSTEM OVERRIDE --- 
        This ensures that when you print the report, it looks like a clean A4 document
        and hides UI elements like the "Add Expense" buttons or navigation.
      */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .sales-container, .sales-container * { visibility: visible; }
          .sales-container { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            padding: 0;
            background: white !important;
            color: black !important;
          }
          .sales-controls, .expense-input-card, .remove-btn, .add-exp-btn, .export-btn { 
            display: none !important; 
          }
          .main-content-grid { display: block !important; }
          .table-container, .expense-section { 
            width: 100% !important; 
            border: 1px solid #eee; 
            margin-bottom: 20px; 
            box-shadow: none !important;
          }
          .stats-grid { 
            display: flex !important; 
            flex-direction: row !important; 
            gap: 10px; 
            margin-bottom: 20px; 
          }
          .stats-card { 
            border: 1px solid #ddd !important; 
            flex: 1; 
            padding: 10px; 
            background: white !important;
          }
          .sales-table { width: 100% !important; border-collapse: collapse; }
          .sales-table th { background: #f4f4f4 !important; color: black !important; border: 1px solid #ddd; }
          .sales-table td { border: 1px solid #ddd; }
          .sales-footer-branding { 
            margin-top: 50px; 
            border-top: 2px solid #000; 
            padding-top: 10px; 
            text-align: center;
          }
        }
      `}} />

      <div className="sales-container">
        
        {/* --- Header Section --- */}
        <header className="sales-header">
          <div className="title-group">
            <div className="icon-bg"><BarChart3 color="#0071e3" size={24} /></div>
            <div>
              <h1>Financial Intelligence</h1>
              <p className="subtitle">Operational Report for {new Date(selectedDate).toDateString()}</p>
            </div>
          </div>
          
          <div className="sales-controls">
            <div className="date-input-group">
              <Calendar size={18} color="#0071e3" />
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
              />
            </div>
            <button className="export-btn" onClick={() => window.print()}>
              <Download size={18} /> PRINT DAILY REPORT
            </button>
          </div>
        </header>

        {/* --- Key Metrics Cards --- */}
        <div className="stats-grid">
          <div className="stats-card">
            <div className="label-group">
              <PieChart size={16} color="#0071e3" />
              <span className="label">MONTHLY CUMULATIVE ({new Date(selectedDate).toLocaleString('default', { month: 'long' })})</span>
            </div>
            <h2 className="value">Ksh {parseFloat(monthlyTotal).toLocaleString()}</h2>
            <div className="trend-indicator positive">Verified Completed Sales</div>
          </div>

          <div className="stats-card highlight">
            <div className="label-group">
              <Wallet size={16} color="#0071e3" />
              <span className="label">DAILY NET (CASH AT HAND)</span>
            </div>
            <h2 className="value">Ksh {netCashAtHand.toLocaleString()}</h2>
            <p className="description">
              Gross: Ksh {dailyRevenue.toLocaleString()} | Expenses: Ksh {totalExpenses.toLocaleString()}
            </p>
          </div>
        </div>

        {/* --- Main Dashboard Content --- */}
        <div className="main-content-grid">
          
          {/* Itemized Sales Table */}
          <div className="table-container">
            <div className="table-header">
              <span className="timestamp">ITEMIZED SALES BREAKDOWN</span>
            </div>
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity Sold</th>
                  <th>Unit Price</th>
                  <th className="text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="loading-state">Refreshing financials...</td></tr>
                ) : reportData.length > 0 ? (
                  reportData.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <div className="product-name-cell">
                          <div className="product-indicator"></div>
                          {item.product_name}
                        </div>
                      </td>
                      <td>{item.total_qty} Units</td>
                      <td>Ksh {parseFloat(item.price).toLocaleString()}</td>
                      <td className="total-cell text-right">
                        Ksh {parseFloat(item.total_revenue).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="4" className="empty-msg">No transactions found for this date.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Expense & Deduction Sidebar */}
          <div className="expense-section">
            <div className="table-header">
              <span className="timestamp"><Receipt size={14} /> DEDUCT EXPENSES</span>
            </div>
            
            <div className="expense-input-card">
              <input 
                type="text" 
                placeholder="Description" 
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
              />
              <div className="input-row">
                <input 
                  type="number" 
                  placeholder="Amount" 
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                />
                <button onClick={addExpense} className="add-exp-btn">
                  <Plus size={18}/>
                </button>
              </div>
            </div>

            <div className="expense-list">
              {expenses.length > 0 ? (
                expenses.map(exp => (
                  <div className="expense-item" key={exp.id}>
                    <div>
                      <p className="exp-name">{exp.name}</p>
                      <p className="exp-amt">- Ksh {parseFloat(exp.amount).toLocaleString()}</p>
                    </div>
                    <button onClick={() => removeExpense(exp.id)} className="remove-btn">
                      <MinusCircle size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <p className="empty-msg-small">No expenses recorded today.</p>
              )}
            </div>
          </div>

        </div>

        {/* Branding Footer */}
        <footer className="sales-footer-branding">
          <p>This document is an automated financial summary generated by First Class World Logistics.</p>
          <p className="branding-text">A Product of CODEY CRAFT AFRICA</p>
        </footer>
      </div>
    </div>
  );
};

export default Sales;