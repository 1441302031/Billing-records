import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Icons from 'lucide-react';
import { 
  Plus, 
  Trash2, 
  PieChart, 
  Wallet, 
  Calendar, 
  Tag, 
  ChevronRight,
  Sparkles,
  Heart,
  Coffee,
  ShoppingBag,
  Utensils,
  Bus,
  Gamepad2,
  Gift,
  Users,
  Settings,
  Clock,
  Check
} from 'lucide-react';

interface User {
  id: number;
  name: string;
  avatar: string;
  family_id: number;
}

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
}

interface Expense {
  id: number;
  amount: number;
  category_id: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  description: string;
  date: string;
  user_name: string;
  participants: string; // JSON string
}

const ICON_OPTIONS = [
  'Utensils', 'ShoppingBag', 'Bus', 'Gamepad2', 'Coffee', 'Gift', 'Tag', 
  'Heart', 'Sparkles', 'Wallet', 'PieChart', 'Users', 'Settings', 'Clock',
  'Camera', 'Music', 'Book', 'Home', 'Car', 'Plane'
];

const COLOR_OPTIONS = [
  'bg-orange-100 text-orange-600',
  'bg-pink-100 text-pink-600',
  'bg-blue-100 text-blue-600',
  'bg-purple-100 text-purple-600',
  'bg-yellow-100 text-yellow-600',
  'bg-red-100 text-red-600',
  'bg-green-100 text-green-600',
  'bg-indigo-100 text-indigo-600',
];

const IconComponent = ({ name, className }: { name: string, className?: string }) => {
  const Icon = (Icons as any)[name] || Tag;
  return <Icon className={className} />;
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginName, setLoginName] = useState('小萌');
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // Filtering & Sorting State
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const getLocalISOTime = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getLocalISOTime());
  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManagingCats, setIsManagingCats] = useState(false);
  const [total, setTotal] = useState(0);

  // Participants State
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [externalParticipant, setExternalParticipant] = useState('');

  // New Category Form
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Tag');
  const [newCatColor, setNewCatColor] = useState(COLOR_OPTIONS[0]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (isLoggedIn && currentUser) {
      fetchInitialData();
    }
  }, [isLoggedIn, currentUser]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchExpenses();
    }
  }, [selectedCategoryId, selectedUserId, sortBy, sortOrder]);

  const fetchUsers = async () => {
    try {
      const usersRes = await fetch('/api/users');
      const usersData = await usersRes.json();
      setUsers(usersData);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: loginName })
      });
      if (res.ok) {
        const userData = await res.json();
        setCurrentUser(userData);
        setIsLoggedIn(true);
      } else {
        alert('登录失败，请检查用户名');
      }
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const fetchInitialData = async () => {
    if (!currentUser) return;
    try {
      const catsRes = await fetch(`/api/categories?familyId=${currentUser.family_id}`);
      const catsData = await catsRes.json();
      setCategories(catsData);
      if (catsData.length > 0) setCategoryId(catsData[0].id);
      fetchExpenses();
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
    }
  };

  const fetchExpenses = async () => {
    if (!currentUser) return;
    try {
      const params = new URLSearchParams();
      params.append('familyId', currentUser.family_id.toString());
      if (selectedCategoryId) params.append('categoryId', selectedCategoryId.toString());
      if (selectedUserId) params.append('userId', selectedUserId.toString());
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const res = await fetch(`/api/expenses?${params.toString()}`);
      const data = await res.json();
      setExpenses(data);
      
      const statsRes = await fetch(`/api/stats?familyId=${currentUser.family_id}`);
      const statsData = await statsRes.json();
      setTotal(statsData.total);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleAddExpense triggered');
    
    if (!currentUser) {
      alert('请先登录');
      return;
    }
    
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('请输入有效的金额');
      return;
    }
    if (!categoryId) {
      alert('请选择分类');
      return;
    }

    setIsSubmitting(true);
    const participants = [...selectedParticipants];
    if (externalParticipant.trim()) {
      participants.push(externalParticipant.trim());
    }

    try {
      const payload = {
        amount: parsedAmount,
        categoryId,
        description,
        date,
        userId: currentUser.id,
        familyId: currentUser.family_id,
        participants
      };
      
      console.log('Sending expense payload:', payload);
      
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const result = await res.json();
        console.log('Expense added successfully, server response:', result);
        
        setAmount('');
        setDescription('');
        setSelectedParticipants([]);
        setExternalParticipant('');
        setIsAdding(false);
        
        // Refresh data
        fetchExpenses();
      } else {
        const errorData = await res.json();
        console.error('Server returned error:', errorData);
        alert(`保存失败: ${errorData.error || '未知错误'}`);
      }
    } catch (err) {
      console.error('Failed to add expense:', err);
      alert('网络错误，请稍后再试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleParticipant = (name: string) => {
    setSelectedParticipants(prev => 
      prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
    );
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !currentUser) return;

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName,
          icon: newCatIcon,
          color: newCatColor,
          familyId: currentUser.family_id
        })
      });
      if (res.ok) {
        setNewCatName('');
        const catsRes = await fetch(`/api/categories?familyId=${currentUser.family_id}`);
        const catsData = await catsRes.json();
        setCategories(catsData);
      }
    } catch (err) {
      console.error('Failed to add category:', err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      fetchExpenses();
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-moe-cream p-4">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-10 rounded-[3rem] shadow-2xl border-4 border-moe-pink w-full max-w-md text-center"
        >
          <div className="w-32 h-32 mx-auto mb-6 rounded-full border-4 border-moe-pink overflow-hidden bg-moe-pink/10 flex items-center justify-center">
             <Icons.User className="w-16 h-16 text-moe-pink" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">萌萌记账</h1>
          <p className="text-slate-500 mb-8">欢迎回来，请选择你的身份~</p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-700 text-left ml-2">选择用户</label>
              <select 
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-moe-pink outline-none transition-all font-bold text-slate-700"
              >
                {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
              </select>
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-moe-pink text-white rounded-2xl font-bold shadow-lg shadow-pink-200 hover:bg-pink-400 transition-all transform active:scale-95"
            >
              进入账本
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      {/* Header / Mascot Area */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
        <div className="flex items-center gap-4">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 rounded-full bg-white border-4 border-moe-pink shadow-lg overflow-hidden flex-shrink-0 relative"
          >
            <img 
              src={currentUser?.avatar || "https://picsum.photos/seed/anime-girl/200/200"} 
              alt="Mascot" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-0 right-0 bg-white rounded-full p-1 shadow-sm border border-moe-pink">
              <Sparkles className="w-4 h-4 text-moe-pink fill-moe-pink" />
            </div>
          </motion.div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-800">萌萌记账</h1>
              <div className="flex items-center gap-1 px-3 py-1 bg-moe-pink/10 text-moe-pink rounded-full text-xs font-bold border border-moe-pink/20">
                <Users className="w-3 h-3" /> 家庭共享中
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-slate-500 text-sm">当前登录:</span>
              <span className="text-moe-pink font-bold">{currentUser?.name}</span>
              <button 
                onClick={() => setIsLoggedIn(false)}
                className="text-xs text-slate-400 hover:text-moe-pink underline ml-2"
              >
                切换账号
              </button>
            </div>
          </div>
        </div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-white p-6 rounded-3xl shadow-xl border-2 border-moe-pink/30 flex items-center gap-6 min-w-[280px]"
        >
          <div className="bg-moe-pink/20 p-4 rounded-2xl">
            <Wallet className="w-8 h-8 text-moe-pink" />
          </div>
          <div>
            <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">家庭本月总支出</p>
            <p className="text-4xl font-bold text-slate-800">¥{total.toFixed(2)}</p>
          </div>
        </motion.div>
      </div>

      {/* Main Content: The Notebook */}
      <div className="w-full max-w-5xl relative">
        {/* Notebook Spiral Decoration */}
        <div className="absolute -left-4 top-10 bottom-10 w-8 notebook-spiral z-10 rounded-full hidden md:block" />
        
        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border-2 border-slate-100 flex flex-col md:flex-row min-h-[600px]">
          
          {/* Left Sidebar: Categories & Stats */}
          <div className="w-full md:w-80 bg-slate-50/50 border-r border-slate-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <PieChart className="w-5 h-5 text-moe-pink" /> 分类筛选
              </h2>
              <button 
                onClick={() => setIsManagingCats(!isManagingCats)}
                className="p-2 text-slate-400 hover:text-moe-pink transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => setSelectedCategoryId(null)}
                className={`w-full flex items-center justify-between group cursor-pointer p-2 rounded-xl transition-all ${!selectedCategoryId ? 'bg-moe-pink/10 text-moe-pink' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${!selectedCategoryId ? 'bg-moe-pink text-white' : 'bg-slate-200 text-slate-500'}`}>
                    <Icons.LayoutGrid className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold">全部账单</span>
                </div>
                {!selectedCategoryId && <Check className="w-4 h-4" />}
              </button>

              {categories.map((cat) => (
                <button 
                  key={cat.id} 
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`w-full flex items-center justify-between group cursor-pointer p-2 rounded-xl transition-all ${selectedCategoryId === cat.id ? 'bg-moe-pink/10 text-moe-pink' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${selectedCategoryId === cat.id ? 'bg-moe-pink text-white' : cat.color}`}>
                      <IconComponent name={cat.icon} className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{cat.name}</span>
                  </div>
                  {selectedCategoryId === cat.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>

            <div className="mt-8">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-moe-pink" /> 成员筛选
              </h2>
              <div className="space-y-2">
                 <button 
                  onClick={() => setSelectedUserId(null)}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${!selectedUserId ? 'bg-moe-pink/10 text-moe-pink' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                   <div className={`p-1 rounded-full border-2 ${!selectedUserId ? 'border-moe-pink' : 'border-transparent'}`}>
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                        <Users className="w-4 h-4" />
                      </div>
                   </div>
                   <span className="text-sm font-bold">全体成员</span>
                </button>
                {users.map(u => (
                  <button 
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${selectedUserId === u.id ? 'bg-moe-pink/10 text-moe-pink' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <div className={`p-1 rounded-full border-2 ${selectedUserId === u.id ? 'border-moe-pink' : 'border-transparent'}`}>
                      <img src={u.avatar} className="w-8 h-8 rounded-full" />
                    </div>
                    <span className="text-sm font-medium">{u.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {isManagingCats && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 p-4 bg-white rounded-2xl border-2 border-dashed border-slate-200"
              >
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">新增分类</h3>
                <form onSubmit={handleAddCategory} className="space-y-3">
                  <input 
                    type="text" 
                    placeholder="分类名称"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full p-2 text-sm border border-slate-100 rounded-lg outline-none focus:border-moe-pink"
                  />
                  <div className="flex flex-wrap gap-1">
                    {ICON_OPTIONS.slice(0, 12).map(icon => (
                      <button 
                        key={icon}
                        type="button"
                        onClick={() => setNewCatIcon(icon)}
                        className={`p-1.5 rounded-lg border ${newCatIcon === icon ? 'border-moe-pink bg-moe-pink/10' : 'border-transparent'}`}
                      >
                        <IconComponent name={icon} className="w-4 h-4 text-slate-400" />
                      </button>
                    ))}
                  </div>
                  <button type="submit" className="w-full py-2 bg-moe-pink text-white text-xs font-bold rounded-lg">添加</button>
                </form>
              </motion.div>
            )}
          </div>

          {/* Right Main Area: Expense List */}
          <div className="flex-1 p-8 relative paper-lines">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">账单明细</h2>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedCategoryId ? `分类: ${categories.find(c => c.id === selectedCategoryId)?.name}` : '全部分类'} 
                  {selectedUserId ? ` • 成员: ${users.find(u => u.id === selectedUserId)?.name}` : ' • 全部成员'}
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                   <button 
                    onClick={() => {
                      if (sortBy === 'date') setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
                      else setSortBy('date');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${sortBy === 'date' ? 'bg-white text-moe-pink shadow-sm' : 'text-slate-500'}`}
                   >
                     时间 {sortBy === 'date' && (sortOrder === 'ASC' ? '↑' : '↓')}
                   </button>
                   <button 
                    onClick={() => {
                      if (sortBy === 'amount') setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
                      else setSortBy('amount');
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${sortBy === 'amount' ? 'bg-white text-moe-pink shadow-sm' : 'text-slate-500'}`}
                   >
                     金额 {sortBy === 'amount' && (sortOrder === 'ASC' ? '↑' : '↓')}
                   </button>
                </div>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsAdding(true)}
                  className="bg-moe-pink hover:bg-pink-400 text-white px-6 py-3 rounded-2xl shadow-lg shadow-pink-200 flex items-center gap-2 font-bold transition-colors"
                >
                  <Plus className="w-5 h-5" /> 记一笔
                </motion.button>
              </div>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {expenses.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-20"
                  >
                    <p className="text-slate-400 italic">目前还没有记录呢，快来记一笔吧~</p>
                  </motion.div>
                ) : (
                  expenses.map((expense) => {
                    let participants = [];
                    try {
                      participants = JSON.parse(expense.participants || '[]');
                    } catch (e) {
                      console.error('Failed to parse participants:', e);
                    }
                    return (
                      <motion.div
                        key={expense.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-2xl ${expense.category_color}`}>
                            <IconComponent name={expense.category_icon} className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">{expense.description || expense.category_name}</span>
                              <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium uppercase">{expense.category_name}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 mt-1 font-medium">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {expense.date.replace('T', ' ')}</span>
                              <span className="flex items-center gap-1"><Icons.UserCheck className="w-3 h-3" /> 记录人: {expense.user_name}</span>
                              {participants.length > 0 && (
                                <span className="flex items-center gap-1 text-moe-pink">
                                  <Users className="w-3 h-3" /> 参与: {participants.join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xl font-bold text-slate-800">-¥{expense.amount.toFixed(2)}</span>
                          <button 
                            onClick={() => handleDelete(expense.id)}
                            className="p-2 text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border-4 border-moe-pink"
            >
              <div className="bg-moe-pink p-6 text-white text-center">
                <h3 className="text-xl font-bold">记一笔开销</h3>
                <p className="text-pink-100 text-sm">认真记录每一笔，做个理财达人！</p>
              </div>
              
              <form onSubmit={handleAddExpense} className="p-8 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">金额 (¥)</label>
                    <input
                      autoFocus
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full text-3xl font-bold p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-moe-pink focus:bg-white outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">日期与时间</label>
                    <input
                      type="datetime-local"
                      step="1"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-moe-pink outline-none transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">分类</label>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryId(cat.id)}
                        className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${
                          categoryId === cat.id 
                            ? 'bg-moe-pink text-white shadow-lg shadow-pink-200' 
                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        <IconComponent name={cat.icon} className="w-5 h-5" />
                        <span className="text-[10px] font-bold truncate w-full text-center">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">参与成员 (谁消费了？)</label>
                  <div className="flex flex-wrap gap-3">
                    <button 
                      type="button"
                      onClick={() => {
                        if (selectedParticipants.length === users.length) setSelectedParticipants([]);
                        else setSelectedParticipants(users.map(u => u.name));
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${selectedParticipants.length === users.length ? 'bg-moe-pink text-white border-moe-pink' : 'border-slate-100 text-slate-400'}`}
                    >
                      全体成员
                    </button>
                    {users.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleParticipant(u.name)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${selectedParticipants.includes(u.name) ? 'bg-moe-pink/10 text-moe-pink border-moe-pink' : 'border-slate-100 text-slate-400'}`}
                      >
                        <img src={u.avatar} className="w-4 h-4 rounded-full" />
                        {u.name}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3">
                    <input 
                      type="text"
                      placeholder="外部成员 (如: 朋友, 同事...)"
                      value={externalParticipant}
                      onChange={(e) => setExternalParticipant(e.target.value)}
                      className="w-full p-3 bg-slate-50 rounded-xl border-2 border-transparent focus:border-moe-pink outline-none text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">备注 (可选)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="买了什么好东西？"
                    className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-moe-pink outline-none transition-all"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-1 py-4 bg-moe-pink text-white rounded-2xl font-bold shadow-lg shadow-pink-200 transition-colors ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-pink-400'}`}
                  >
                    {isSubmitting ? '正在记录...' : '确认记录'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="mt-12 text-slate-400 text-sm flex items-center gap-2">
        Made with <Heart className="w-4 h-4 text-pink-300 fill-pink-300" /> for a better life
      </footer>
    </div>
  );
}
