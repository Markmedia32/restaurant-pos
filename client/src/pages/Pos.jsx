import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShoppingCart, Smartphone, Trash2, Plus, Minus, Search, Banknote, X, Printer } from 'lucide-react';
import API_BASE_URL from '../config'; // Add this at the top

const Pos = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [clientName, setClientName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
       const res = await axios.get(`${API_BASE_URL}/api/menu`);
        setMenuItems(res.data);
      } catch (err) {
        console.error("Error fetching menu:", err);
      }
    };
    fetchMenu();
  }, []);

  const addToCart = (item) => {
    const existing = cart.find(i => i.id === item.id);
    if (existing) {
      setCart(cart.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, { ...item, qty: 1 }]);
    }
  };

  const updateQty = (id, delta) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));

  const total = cart.reduce((acc, item) => acc + (parseFloat(item.price) * item.qty), 0);

  // ✅ POLLING LOGIC
  const startPolling = (checkoutID, orderData) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/check-payment/${checkoutID}`);
        
        if (res.data.status === 'Completed') {
          clearInterval(interval);
          setLoading(false);
          setActiveOrder({ 
            name: orderData.client, 
            amount: orderData.total, 
            method: 'M-Pesa', 
            items: orderData.items 
          });
          setShowReceipt(true);
          setCart([]);
          setPhoneNumber('');
          setClientName('');
        } else if (res.data.status === 'Failed') {
          // New: Catch if the callback marks it as failed (like the timeout error)
          clearInterval(interval);
          setLoading(false);
          alert("Payment Failed or Timed Out. Please try again.");
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 2500); 

    setTimeout(() => {
        clearInterval(interval);
        setLoading(false);
    }, 90000); // 90 second cutoff
  };

  const handleMpesaPayment = async () => {
    if (!phoneNumber.startsWith('254') || phoneNumber.length !== 12) {
      alert("Please enter a valid format: 2547XXXXXXXX");
      return;
    }
    if (cart.length === 0) return alert("Cart is empty");

    setLoading(true);
    
    // Capture current cart state for the receipt later
    const orderSnapshot = {
        total: total,
        client: clientName || "Guest Customer",
        items: [...cart]
    };

    try {
      const res = await axios.post(`${API_BASE_URL}/api/pay/stk`, {
        amount: total,
        phone: phoneNumber,
        clientName: orderSnapshot.client,
        items: orderSnapshot.items
      });
      
      alert("STK Push Sent! Enter PIN on your phone.");
      startPolling(res.data.CheckoutRequestID, orderSnapshot);
    } catch (err) {
      alert("Payment service unavailable. Check backend.");
      setLoading(false);
    }
  };

  const handleCashPayment = async () => {
    if (cart.length === 0) return alert("Cart is empty");
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/pay/cash', {
        amount: total,
        clientName: clientName || "Guest Customer",
        items: cart 
      });
      setActiveOrder({ name: clientName || "Guest Customer", amount: total, method: 'Cash', items: [...cart] });
      setShowReceipt(true);
      setCart([]);
      setClientName('');
      setLoading(false);
    } catch (err) {
      alert("Cash payment failed");
      setLoading(false);
    }
  };

  const filteredMenu = menuItems.filter(item => 
    item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pos-layout">
      <div className="pos-main">
        <div className="pos-search-bar">
          <Search size={20} />
          <input 
            type="text" 
            placeholder="Search menu items..." 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="product-grid">
          {filteredMenu.map(item => (
            <div key={item.id} className="menu-card" onClick={() => addToCart(item)}>
              <div className="menu-card-price">Ksh {item.price}</div>
              <h3 className="menu-card-name">{item.product_name}</h3>
              <span className="menu-card-cat">{item.category}</span>
              <div className="add-overlay"><Plus /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="pos-sidebar">
        <div className="order-header">
          <ShoppingCart size={22} />
          <h2>Current Order</h2>
        </div>

        <div className="order-items-list">
          {cart.length === 0 ? (
            <div className="empty-cart-msg">Select items to start order</div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="order-item-row">
                <div className="order-item-details">
                  <span className="order-item-name">{item.product_name}</span>
                  <span className="order-item-unit">Ksh {item.price}</span>
                </div>
                <div className="order-item-controls">
                  <button onClick={() => updateQty(item.id, -1)}><Minus size={14}/></button>
                  <span className="order-qty">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)}><Plus size={14}/></button>
                  <Trash2 
                    size={18} 
                    className="remove-btn" 
                    onClick={() => removeFromCart(item.id)} 
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="order-summary-footer">
          <div className="client-field">
            <label>Customer Name</label>
            <input 
              type="text" 
              placeholder="Enter name" 
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div className="summary-row total">
            <span>Amount Due</span>
            <span>Ksh {total.toLocaleString()}</span>
          </div>

          <div className="mpesa-field">
            <label>M-Pesa Number</label>
            <div className="input-with-icon">
              <Smartphone size={18} />
              <input 
                type="text" 
                placeholder="2547XXXXXXXX" 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="action-buttons">
            <button 
              className={`pay-action-btn mpesa ${loading ? 'loading' : ''}`}
              onClick={handleMpesaPayment}
              disabled={loading || cart.length === 0}
            >
              {loading ? "PROCESSING..." : "PROCESS MPESA PAYMENT"}
            </button>

            <button 
              className="pay-action-btn cash"
              onClick={handleCashPayment}
              disabled={loading || cart.length === 0}
            >
              <Banknote size={20} /> PROCESS CASH PAYMENT
            </button>
          </div>
        </div>
      </div>

      {showReceipt && (
        <div className="print-container">
          <div id="thermal-receipt" className="receipt-print-area">
            <div className="receipt-center">
              <h1 className="restaurant-name">FIRST CLASS LOGISTICS</h1>
              <p className="receipt-subtitle">Official Receipt</p>
            </div>
            
            <div className="receipt-info">
              <p><span>Date:</span> {new Date().toLocaleString()}</p>
              <p><span>Customer:</span> {activeOrder?.name || "Guest"}</p>
              <p><span>Payment:</span> {activeOrder?.method}</p>
            </div>

            <div className="receipt-divider">--------------------------------</div>

            <div className="receipt-items">
              {activeOrder?.items.map((item, index) => (
                <div key={index} className="receipt-line">
                  <div className="item-main">{item.product_name} x{item.qty}</div>
                  <div className="item-price">Ksh {(item.price * item.qty).toLocaleString()}</div>
                </div>
              ))}
            </div>

            <div className="receipt-divider">--------------------------------</div>

            <div className="receipt-totals">
              <div className="receipt-line">
                <span>Sub-Total (Excl. VAT)</span>
                <span>Ksh {(activeOrder?.amount / 1.16).toFixed(2)}</span>
              </div>
              <div className="receipt-line">
                <span>VAT (16%)</span>
                <span>Ksh {(activeOrder?.amount - (activeOrder?.amount / 1.16)).toFixed(2)}</span>
              </div>
              <div className="receipt-line grand-total">
                <span>TOTAL (Incl. VAT)</span>
                <span>Ksh {activeOrder?.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="receipt-divider">--------------------------------</div>
            
            <div className="receipt-center footer">
              <p>Thank you for dining with us!</p>
              <p className="powered-by">Powered by Codey Craft Africa</p>
            </div>
          </div>

          <div className="print-actions">
            <button className="btn-print" onClick={() => window.print()}>
              <Printer size={18} /> PRINT RECEIPT
            </button>
            <button className="btn-close" onClick={() => setShowReceipt(false)}>
              DONE / NEW ORDER
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pos;