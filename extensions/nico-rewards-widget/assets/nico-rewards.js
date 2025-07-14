class NicoRewards {
  constructor(config) {
    this.config = {
      apiUrl: config.apiUrl || '/apps/proxy',
      position: config.position || 'bottom-right',
      color: config.color || '#000000',
      showPointsCounter: config.showPointsCounter !== false,
      customerId: config.customerId || null
    };
    
    this.isLoggedIn = !!this.config.customerId;
    this.customerData = null;
    this.isModalOpen = false;
    
    this.init();
  }

  init() {
    this.createWidget();
    this.attachEventListeners();
    
    // Always try to load customer data - let the server handle authentication
    this.loadCustomerData();
  }

  createWidget() {
    // Create widget container
    this.widget = document.createElement('div');
    this.widget.id = 'nico-rewards-widget';
    this.widget.className = `nico-rewards-widget ${this.config.position}`;
    
    // Create widget button
    this.widgetButton = document.createElement('button');
    this.widgetButton.className = 'nico-rewards-button';
    this.widgetButton.innerHTML = this.getButtonHTML();
    
    // Create modal
    this.modal = document.createElement('div');
    this.modal.id = 'nico-rewards-modal';
    this.modal.className = 'nico-rewards-modal';
    this.modal.style.display = 'none';
    this.modal.innerHTML = this.getModalHTML();
    
    // Append to widget
    this.widget.appendChild(this.widgetButton);
    this.widget.appendChild(this.modal);
    
    // Add styles
    this.injectStyles();
    
    // Append to body
    document.body.appendChild(this.widget);
  }

  getButtonHTML() {
    return `
      <div class="nico-rewards-button-content">
        <div class="nico-rewards-icon">🎁</div>
        ${this.config.showPointsCounter ? 
          `<div class="nico-rewards-points" id="nico-points-counter" style="display: none;">...</div>` : 
          ''
        }
      </div>
    `;
  }

  getModalHTML() {
    return `
      <div class="nico-rewards-modal-content">
        <div class="nico-rewards-header">
          <h3>Nico Rewards</h3>
          <button class="nico-rewards-close">&times;</button>
        </div>
        <div class="nico-rewards-body">
          <div class="nico-rewards-loading" id="rewards-loading">Loading...</div>
          <div class="nico-rewards-content" id="rewards-content" style="display: none;">
            <!-- Content will be loaded dynamically -->
          </div>
          <div class="nico-rewards-login" id="rewards-login" style="display: none;">
            <h4>Join our rewards program!</h4>
            <p>Sign in to start earning points and unlock exclusive rewards.</p>
            <a href="/account/login" class="nico-rewards-login-btn">Sign In</a>
            <a href="/account/register" class="nico-rewards-register-btn">Create Account</a>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Widget button click
    this.widgetButton.addEventListener('click', () => {
      this.toggleModal();
    });

    // Modal close button
    const closeButton = this.modal.querySelector('.nico-rewards-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.closeModal();
      });
    }

    // Close modal when clicking outside
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.closeModal();
      }
    });

    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isModalOpen) {
        this.closeModal();
      }
    });
  }

  async loadCustomerData() {
    try {
      // Don't pass customer_id - let Shopify handle logged_in_customer_id automatically
      const response = await fetch(`${this.config.apiUrl}/customer/summary`);
      
      // Check if response is HTML (error page) instead of JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Invalid response type:', contentType);
        console.error('Response status:', response.status);
        console.error('Expected JSON but got:', contentType);
        
        // Try to get the text to see what we're receiving
        const text = await response.text();
        console.error('Response preview:', text.substring(0, 200));
        
        this.handleError('Service temporarily unavailable');
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          this.customerData = data.data;
          this.updatePointsCounter();
          this.updateModalContent();
        } else if (data.success && !data.data) {
          // Customer not logged in - this is normal
          console.log('Customer not logged in');
          this.handleNotLoggedIn();
        }
      } else {
        console.error('Failed to load customer data: HTTP', response.status);
        const errorData = await response.json();
        console.error('Error details:', errorData);
        this.handleError();
      }
    } catch (error) {
      console.error('Failed to load customer data:', error);
      this.handleError();
    }
  }

  handleNotLoggedIn() {
    // Hide points counter if customer is not logged in
    const counter = document.getElementById('nico-points-counter');
    if (counter) {
      counter.style.display = 'none';
    }
    
    // Show login screen in modal
    const loading = document.getElementById('rewards-loading');
    const content = document.getElementById('rewards-content');
    const login = document.getElementById('rewards-login');
    
    if (loading) loading.style.display = 'none';
    if (content) content.style.display = 'none';
    if (login) login.style.display = 'block';
  }

  handleError(message = 'Unable to load rewards data. Please try again later.') {
    // Show error state in modal content
    const loading = document.getElementById('rewards-loading');
    const content = document.getElementById('rewards-content');
    
    if (loading) loading.style.display = 'none';
    if (content) {
      content.style.display = 'block';
      content.innerHTML = `<p>${message}</p>`;
    }
  }

  updatePointsCounter() {
    const counter = document.getElementById('nico-points-counter');
    if (counter && this.customerData) {
      counter.textContent = this.customerData.customer.totalPoints;
      counter.style.display = 'block'; // Show the counter when we have data
    }
  }

  updateModalContent() {
    const loading = document.getElementById('rewards-loading');
    const content = document.getElementById('rewards-content');
    
    if (loading) loading.style.display = 'none';
    if (content && this.customerData) {
      content.style.display = 'block';
      content.innerHTML = this.getCustomerContentHTML();
    }
  }

  getCustomerContentHTML() {
    if (!this.customerData) return '';

    const { customer, availableRedemptions, tierProgression } = this.customerData;
    
    return `
      <div class="nico-rewards-summary">
        <div class="nico-rewards-points-display">
          <h4>${customer.totalPoints} Points</h4>
          <p>Available to redeem</p>
        </div>
        
        <div class="nico-rewards-tier">
          <h5>${customer.membershipTier} Member</h5>
          ${tierProgression.next ? `
            <div class="nico-rewards-progress">
              <p>Progress to ${tierProgression.next.name}</p>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${tierProgression.progressToNext}%"></div>
              </div>
              <p>$${(tierProgression.next.minSpent - customer.totalSpent).toFixed(2)} to go</p>
            </div>
          ` : '<p>You\'ve reached the highest tier!</p>'}
        </div>

        ${availableRedemptions.length > 0 ? `
          <div class="nico-rewards-redemptions">
            <h5>Available Rewards</h5>
            <div class="redemptions-list">
              ${availableRedemptions.map(redemption => `
                <div class="redemption-item" data-option-id="${redemption.id}">
                  <div class="redemption-info">
                    <h6>${redemption.name}</h6>
                    <p>${redemption.description || ''}</p>
                  </div>
                  <div class="redemption-cost">
                    <span>${redemption.pointsCost} pts</span>
                    <button class="redeem-btn" onclick="nicoRewards.redeemPoints('${redemption.id}')">
                      Redeem
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <div class="nico-rewards-recent">
          <h5>Recent Activity</h5>
          <div class="transactions-list">
            ${customer.transactions.slice(0, 5).map(transaction => `
              <div class="transaction-item">
                <span class="transaction-desc">${transaction.description}</span>
                <span class="transaction-points ${transaction.points > 0 ? 'positive' : 'negative'}">
                  ${transaction.points > 0 ? '+' : ''}${transaction.points} pts
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  async redeemPoints(optionId) {
    if (!this.config.customerId) return;

    try {
      const response = await fetch(`${this.config.apiUrl}/customer/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerId: this.config.customerId,
          optionId: optionId
        })
      });

      if (response.ok) {
        // Reload customer data to reflect changes
        await this.loadCustomerData();
        this.showNotification('Points redeemed successfully!');
      } else {
        throw new Error('Failed to redeem points');
      }
    } catch (error) {
      console.error('Redemption failed:', error);
      this.showNotification('Failed to redeem points. Please try again.', 'error');
    }
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `nico-rewards-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  toggleModal() {
    if (this.isModalOpen) {
      this.closeModal();
    } else {
      this.openModal();
    }
  }

  openModal() {
    this.modal.style.display = 'flex';
    this.isModalOpen = true;
    document.body.style.overflow = 'hidden';
    
    // Load fresh data when opening
    if (this.isLoggedIn) {
      this.loadCustomerData();
    }
  }

  closeModal() {
    this.modal.style.display = 'none';
    this.isModalOpen = false;
    document.body.style.overflow = '';
  }

  injectStyles() {
    if (document.getElementById('nico-rewards-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'nico-rewards-styles';
    styles.textContent = `
      .nico-rewards-widget {
        position: fixed;
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .nico-rewards-widget.bottom-right {
        bottom: 20px;
        right: 20px;
      }

      .nico-rewards-widget.bottom-left {
        bottom: 20px;
        left: 20px;
      }

      .nico-rewards-widget.top-right {
        top: 20px;
        right: 20px;
      }

      .nico-rewards-widget.top-left {
        top: 20px;
        left: 20px;
      }

      .nico-rewards-button {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, ${this.config.color} 0%, #4a5568 100%);
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }

      .nico-rewards-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }

      .nico-rewards-button-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        font-size: 12px;
      }

      .nico-rewards-icon {
        font-size: 24px;
      }

      .nico-rewards-points {
        font-size: 10px;
        font-weight: bold;
        margin-top: 2px;
      }

      .nico-rewards-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
      }

      .nico-rewards-modal-content {
        background: white;
        border-radius: 12px;
        max-width: 400px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      }

      .nico-rewards-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #e2e8f0;
      }

      .nico-rewards-header h3 {
        margin: 0;
        color: #2d3748;
        font-size: 18px;
      }

      .nico-rewards-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #718096;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .nico-rewards-body {
        padding: 20px;
      }

      .nico-rewards-login {
        text-align: center;
      }

      .nico-rewards-login h4 {
        color: #2d3748;
        margin-bottom: 8px;
      }

      .nico-rewards-login p {
        color: #718096;
        margin-bottom: 20px;
      }

      .nico-rewards-login-btn,
      .nico-rewards-register-btn {
        display: inline-block;
        padding: 12px 24px;
        margin: 5px;
        border-radius: 6px;
        text-decoration: none;
        font-weight: 500;
        transition: all 0.2s;
      }

      .nico-rewards-login-btn {
        background: ${this.config.color};
        color: white;
      }

      .nico-rewards-register-btn {
        background: #f7fafc;
        color: #4a5568;
        border: 1px solid #e2e8f0;
      }

      .nico-rewards-points-display {
        text-align: center;
        margin-bottom: 20px;
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border-radius: 8px;
      }

      .nico-rewards-points-display h4 {
        margin: 0 0 5px 0;
        font-size: 24px;
      }

      .nico-rewards-tier {
        margin-bottom: 20px;
        padding: 15px;
        background: #f7fafc;
        border-radius: 8px;
      }

      .nico-rewards-tier h5 {
        margin: 0 0 10px 0;
        color: #2d3748;
      }

      .progress-bar {
        width: 100%;
        height: 8px;
        background: #e2e8f0;
        border-radius: 4px;
        overflow: hidden;
        margin: 5px 0;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #48bb78, #38a169);
        transition: width 0.3s ease;
      }

      .redemption-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 15px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 10px;
      }

      .redemption-info h6 {
        margin: 0 0 5px 0;
        color: #2d3748;
      }

      .redemption-info p {
        margin: 0;
        color: #718096;
        font-size: 12px;
      }

      .redemption-cost {
        text-align: right;
      }

      .redeem-btn {
        background: ${this.config.color};
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        margin-top: 5px;
      }

      .transaction-item {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #f1f5f9;
      }

      .transaction-points.positive {
        color: #48bb78;
      }

      .transaction-points.negative {
        color: #f56565;
      }

      .nico-rewards-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 10002;
      }

      .nico-rewards-notification.success {
        background: #48bb78;
      }

      .nico-rewards-notification.error {
        background: #f56565;
      }

      @media (max-width: 480px) {
        .nico-rewards-modal-content {
          max-width: 95%;
        }
        
        .nico-rewards-widget {
          bottom: 15px;
          right: 15px;
        }
        
        .nico-rewards-button {
          width: 50px;
          height: 50px;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }
}

// Initialize widget when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Get customer ID from Shopify liquid variables
  const customerId = window.Shopify?.customer?.id;
  
  // Get settings from the theme app extension
  const widgetSettings = window.nicoRewardsSettings || {};
  
  // Initialize the widget
  window.nicoRewards = new NicoRewards({
    customerId: customerId,
    apiUrl: '/apps/proxy',
    position: widgetSettings.widget_position || 'bottom-right',
    color: widgetSettings.widget_color || '#000000',
    showPointsCounter: widgetSettings.show_points_counter !== false
  });
});