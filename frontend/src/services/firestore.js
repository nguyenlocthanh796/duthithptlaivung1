import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore'
import { db } from '../firebase'

const usersCollection = collection(db, 'users')
const postsCollection = collection(db, 'posts')
const examsCollection = collection(db, 'exams')
const examRoomsCollection = collection(db, 'examRooms')
const submissionsCollection = collection(db, 'submissions')
const notificationsCollection = collection(db, 'notifications')
const chatHistoryCollection = collection(db, 'chatHistory')
const documentsCollection = collection(db, 'documents')

// Helper function to normalize arrays (handles both array and object formats from Firestore)
function normalizeArray(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  return Object.values(value)
}

export const upsertUserProfile = async (user) => {
  try {
    const userDoc = doc(usersCollection, user.uid)
    // Include uid field to satisfy Firestore rules (required for create)
    await setDoc(
      userDoc,
      {
        uid: user.uid, // Required by Firestore rules for create operation
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        lastLogin: serverTimestamp(),
        roles: arrayUnion('student'),
      },
      { merge: true }
    )
  } catch (error) {
    // Handle ERR_BLOCKED_BY_CLIENT (ad blocker) and network errors gracefully
    const errorMessage = error?.message || ''
    const errorCode = error?.code || ''
    const errorName = error?.name || ''
    
    // Check for various forms of blocking/network errors
    if (errorMessage.includes('ERR_BLOCKED_BY_CLIENT') || 
        errorMessage.includes('blocked') ||
        errorMessage.includes('network') ||
        errorMessage.includes('Failed to fetch') ||
        errorCode === 'unavailable' ||
        errorCode === 'cancelled' ||
        errorCode === 'deadline-exceeded' ||
        errorName === 'NetworkError' ||
        errorName === 'AbortError') {
      console.warn('Firestore request blocked or failed (likely by ad blocker or network issue). User profile update skipped.', {
        message: errorMessage,
        code: errorCode,
        name: errorName
      })
      // Don't throw - allow app to continue functioning
      return
    }
    // Re-throw other errors (only critical ones)
    console.error('Error updating user profile:', error)
    throw error
  }
}

// Optimized for Firebase free tier - limit reads
export const watchPosts = (callback, limitCount = 20) => {
  // Use limit to minimize reads (Firebase free tier: 50K reads/day)
  const q = query(
    postsCollection, 
    orderBy('createdAt', 'desc'),
    limit(limitCount) // Reduced from limitCount * 2 to save reads
  )
  return onSnapshot(q, (snapshot) => {
    const mapped = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .filter((post) => !post.isHidden) // Filter client side
    callback(mapped)
  })
}

// Optimized for Firebase free tier - limit reads
export const getMorePosts = async (lastPost, limitCount = 20) => {
  if (!lastPost) return []
  const q = query(
    postsCollection,
    orderBy('createdAt', 'desc'),
    startAfter(lastPost.createdAt?.toDate?.() || lastPost.createdAt),
    limit(limitCount) // Reduced to save reads
  )
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((post) => !post.isHidden) // Filter client side
}

export const createPost = async ({ text, imageUrl, imageUrls, documentUrl, documentType, tags, author }) => {
  await addDoc(postsCollection, {
    text,
    imageUrl: imageUrl || (imageUrls && imageUrls.length > 0 ? imageUrls[0] : null) || null, // Backward compatible
    imageUrls: imageUrls || (imageUrl ? [imageUrl] : null), // Support multiple images
    documentUrl: documentUrl || null,
    documentType: documentType || null,
    tags: tags || [],
    author,
    likes: [],
    comments: [],
    solution: null,
    solvedBy: null,
    solvedAt: null,
    isFlagged: false,
    isHidden: false,
    isPendingReview: false,
    editedAt: null,
    createdAt: serverTimestamp(),
  })
}

export const updatePost = async ({ postId, text, imageUrl, documentUrl, documentType }) => {
  const postRef = doc(postsCollection, postId)
  const updateData = {
    editedAt: serverTimestamp(),
  }
  if (text !== undefined) updateData.text = text
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl
  if (documentUrl !== undefined) updateData.documentUrl = documentUrl
  if (documentType !== undefined) updateData.documentType = documentType
  await updateDoc(postRef, updateData)
}

export const solvePost = async ({ postId, solution, solvedBy }) => {
  const postRef = doc(postsCollection, postId)
  await updateDoc(postRef, {
    solution,
    solvedBy,
    solvedAt: serverTimestamp(),
    isFlagged: false,
  })
}

export const updatePostSolution = async ({ postId, solution, updatedBy }) => {
  const postRef = doc(postsCollection, postId)
  await updateDoc(postRef, {
    solution,
    updatedBy,
    updatedAt: serverTimestamp(),
    isFlagged: false,
  })
}

export const flagPostSolution = async ({ postId }) => {
  const postRef = doc(postsCollection, postId)
  await updateDoc(postRef, {
    isFlagged: true,
    flaggedAt: serverTimestamp(),
  })
}

export const deletePostSolution = async ({ postId }) => {
  const postRef = doc(postsCollection, postId)
  await updateDoc(postRef, {
    solution: null,
    solvedBy: null,
    solvedAt: null,
    isFlagged: false,
  })
}

export const deletePost = async ({ postId }) => {
  const postRef = doc(postsCollection, postId)
  await deleteDoc(postRef)
}

export const flagPost = async ({ postId, reason }) => {
  const postRef = doc(postsCollection, postId)
  await updateDoc(postRef, {
    isFlagged: true,
    isPendingReview: true,
    isHidden: true,
    flaggedReason: reason || 'Vi phạm quy định',
    flaggedAt: serverTimestamp(),
  })
}

export const approvePost = async ({ postId }) => {
  const postRef = doc(postsCollection, postId)
  await updateDoc(postRef, {
    isPendingReview: false,
    isHidden: false,
    isFlagged: false,
    approvedAt: serverTimestamp(),
  })
}

export const rejectPost = async ({ postId }) => {
  const postRef = doc(postsCollection, postId)
  await deleteDoc(postRef)
}

export const toggleLike = async ({ postId, userId }) => {
  if (!postId || !userId) {
    throw new Error('Missing required parameters: postId and userId are required')
  }
  
  const postRef = doc(postsCollection, postId)
  const snapshot = await getDoc(postRef)
  
  if (!snapshot.exists()) {
    throw new Error('Post not found')
  }
  
  const likes = normalizeArray(snapshot.data().likes || [])
  const hasLiked = likes.includes(userId)
  
  await updateDoc(postRef, {
    likes: hasLiked ? arrayRemove(userId) : arrayUnion(userId),
  })
}

export const addComment = async ({ postId, comment }) => {
  if (!postId || !comment) {
    throw new Error('Missing required parameters: postId and comment are required')
  }
  
  if (!comment.text?.trim()) {
    throw new Error('Comment text is required')
  }
  
  // Ensure comment has proper structure
  const commentWithMetadata = {
    ...comment,
    text: comment.text.trim(),
    replies: comment.replies || [],
    createdAt: comment.createdAt || new Date().toISOString(),
  }
  
  const postRef = doc(postsCollection, postId)
  const snapshot = await getDoc(postRef)
  
  if (!snapshot.exists()) {
    throw new Error('Post not found')
  }
  
  await updateDoc(postRef, {
    comments: arrayUnion(commentWithMetadata),
  })
}

export const solveComment = async ({ postId, commentIndex, solution, solvedBy }) => {
  const postRef = doc(postsCollection, postId)
  const snapshot = await getDoc(postRef)
  const comments = snapshot.data().comments || []
  if (comments[commentIndex]) {
    comments[commentIndex] = {
      ...comments[commentIndex],
      solution,
      solvedBy,
      solvedAt: serverTimestamp(),
      isFlagged: false,
    }
    await updateDoc(postRef, { comments })
  }
}

export const updateCommentSolution = async ({ postId, commentIndex, solution, updatedBy }) => {
  const postRef = doc(postsCollection, postId)
  const snapshot = await getDoc(postRef)
  const comments = snapshot.data().comments || []
  if (comments[commentIndex]) {
    comments[commentIndex] = {
      ...comments[commentIndex],
      solution,
      updatedBy,
      updatedAt: serverTimestamp(),
      isFlagged: false,
    }
    await updateDoc(postRef, { comments })
  }
}

export const flagCommentSolution = async ({ postId, commentIndex }) => {
  const postRef = doc(postsCollection, postId)
  const snapshot = await getDoc(postRef)
  const comments = snapshot.data().comments || []
  if (comments[commentIndex]) {
    comments[commentIndex] = {
      ...comments[commentIndex],
      isFlagged: true,
      flaggedAt: serverTimestamp(),
    }
    await updateDoc(postRef, { comments })
  }
}

export const addReplyToComment = async ({ postId, commentIndex, reply }) => {
  if (!postId || commentIndex === undefined || !reply) {
    throw new Error('Missing required parameters: postId, commentIndex, and reply are required')
  }
  
  const postRef = doc(postsCollection, postId)
  const snapshot = await getDoc(postRef)
  
  if (!snapshot.exists()) {
    throw new Error('Post not found')
  }
  
  const comments = normalizeArray(snapshot.data().comments || [])
  
  if (!comments[commentIndex]) {
    throw new Error('Comment not found')
  }
  
  // Initialize replies array if it doesn't exist
  if (!comments[commentIndex].replies) {
    comments[commentIndex].replies = []
  }
  
  // Add reply with proper structure
  const replyWithMetadata = {
    ...reply,
    createdAt: reply.createdAt || new Date().toISOString(),
    replies: reply.replies || [], // Support nested replies
  }
  
  comments[commentIndex].replies = [...(comments[commentIndex].replies || []), replyWithMetadata]
  
  await updateDoc(postRef, { comments })
}

export const deleteComment = async ({ postId, commentIndex }) => {
  if (!postId || commentIndex === undefined) {
    throw new Error('Missing required parameters: postId and commentIndex are required')
  }
  
  const postRef = doc(postsCollection, postId)
  const snapshot = await getDoc(postRef)
  
  if (!snapshot.exists()) {
    throw new Error('Post not found')
  }
  
  const comments = normalizeArray(snapshot.data().comments || [])
  
  if (!comments[commentIndex]) {
    throw new Error('Comment not found')
  }
  
  // Remove comment from array
  comments.splice(commentIndex, 1)
  
  await updateDoc(postRef, { comments })
}

export const deleteReply = async ({ postId, commentIndex, replyIndex }) => {
  if (!postId || commentIndex === undefined || replyIndex === undefined) {
    throw new Error('Missing required parameters: postId, commentIndex, and replyIndex are required')
  }
  
  const postRef = doc(postsCollection, postId)
  const snapshot = await getDoc(postRef)
  
  if (!snapshot.exists()) {
    throw new Error('Post not found')
  }
  
  const comments = normalizeArray(snapshot.data().comments || [])
  
  if (!comments[commentIndex] || !comments[commentIndex].replies) {
    throw new Error('Comment or reply not found')
  }
  
  comments[commentIndex].replies.splice(replyIndex, 1)
  
  await updateDoc(postRef, { comments })
}

export const updateComment = async ({ postId, commentIndex, text }) => {
  if (!postId || commentIndex === undefined || !text?.trim()) {
    throw new Error('Missing required parameters: postId, commentIndex, and text are required')
  }
  
  const postRef = doc(postsCollection, postId)
  const snapshot = await getDoc(postRef)
  
  if (!snapshot.exists()) {
    throw new Error('Post not found')
  }
  
  const comments = normalizeArray(snapshot.data().comments || [])
  
  if (!comments[commentIndex]) {
    throw new Error('Comment not found')
  }
  
  comments[commentIndex] = {
    ...comments[commentIndex],
    text: text.trim(),
    editedAt: serverTimestamp(),
  }
  
  await updateDoc(postRef, { comments })
}

export const updateReply = async ({ postId, commentIndex, replyIndex, text }) => {
  if (!postId || commentIndex === undefined || replyIndex === undefined || !text?.trim()) {
    throw new Error('Missing required parameters: postId, commentIndex, replyIndex, and text are required')
  }
  
  const postRef = doc(postsCollection, postId)
  const snapshot = await getDoc(postRef)
  
  if (!snapshot.exists()) {
    throw new Error('Post not found')
  }
  
  const comments = normalizeArray(snapshot.data().comments || [])
  
  if (!comments[commentIndex] || !comments[commentIndex].replies?.[replyIndex]) {
    throw new Error('Comment or reply not found')
  }
  
  comments[commentIndex].replies[replyIndex] = {
    ...comments[commentIndex].replies[replyIndex],
    text: text.trim(),
    editedAt: serverTimestamp(),
  }
  
  await updateDoc(postRef, { comments })
}

export const getUserRoles = async (userId) => {
  const userRef = doc(usersCollection, userId)
  const snapshot = await getDoc(userRef)
  if (!snapshot.exists()) return []
  const data = snapshot.data()
  return data.roles || []
}

export const setUserRole = async ({ userId, roles }) => {
  const userRef = doc(usersCollection, userId)
  await setDoc(userRef, { roles }, { merge: true })
}

export const saveQuestionBank = async ({ examTitle, questionPayload }) => {
  const examRef = doc(examsCollection, examTitle)
  await setDoc(
    examRef,
    {
      title: examTitle,
      ...questionPayload,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
  return examRef
}

export const createExamRoom = async ({ examId, password, startTime, endTime }) => {
  return addDoc(examRoomsCollection, {
    examId,
    password,
    startTime,
    endTime,
    createdAt: serverTimestamp(),
  })
}

export const findExamRoomByPassword = async (password) => {
  if (!password || !password.trim()) {
    throw new Error('Mật khẩu không được để trống')
  }
  
  const q = query(examRoomsCollection, where('password', '==', password.trim()))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return null
  const docSnap = snapshot.docs[0]
  return { id: docSnap.id, ...docSnap.data() }
}

export const watchExamRooms = (callback) => {
  const q = query(examRoomsCollection, orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
  })
}

export const getAllExamRooms = async () => {
  const q = query(examRoomsCollection, orderBy('createdAt', 'desc'))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
}

export const getExamById = async (examId) => {
  const examRef = doc(examsCollection, examId)
  const snap = await getDoc(examRef)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() }
}

export const saveSubmission = async ({ examRoomId, examId, userId, answers }) => {
  // IMPORTANT: Do NOT send score - Cloud Function will calculate it server-side
  // This prevents students from hacking their scores
  return addDoc(submissionsCollection, {
    examRoomId,
    examId, // Add examId for Cloud Function to get correct answers
    userId,
    answers, // Only send answers, NOT score
    // score is NOT included - Cloud Function will calculate it
    submittedAt: serverTimestamp(),
  }).then((docRef) => ({ id: docRef.id })) // Return submission ID for tracking
}

export const watchSubmissions = (callback) => {
  const q = query(submissionsCollection, orderBy('submittedAt', 'desc'))
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
  })
}

export const getTrendingPosts = async (limitCount = 5) => {
  // Lấy posts gần đây và filter client-side để tránh lỗi index
  const q = query(
    postsCollection,
    orderBy('createdAt', 'desc'),
    limit(limitCount * 5) // Lấy nhiều để filter và sort
  )
  const snapshot = await getDocs(q)
  const posts = snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((post) => !post.isHidden)
  
  // Sort by engagement (comments + likes)
  return posts
    .map((post) => {
      const comments = Array.isArray(post.comments) ? post.comments : []
      const likes = Array.isArray(post.likes) ? post.likes : []
      return {
        ...post,
        engagement: comments.length * 2 + likes.length, // Comments worth more
      }
    })
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, limitCount)
}

// Save Post Feature
export const savePost = async ({ userId, postId }) => {
  const savedRef = doc(collection(db, 'users', userId, 'savedPosts'), postId)
  await setDoc(savedRef, { savedAt: serverTimestamp() })
}

export const unsavePost = async ({ userId, postId }) => {
  const savedRef = doc(collection(db, 'users', userId, 'savedPosts'), postId)
  await deleteDoc(savedRef)
}

export const getSavedPosts = async (userId) => {
  const savedRef = collection(db, 'users', userId, 'savedPosts')
  const snapshot = await getDocs(savedRef)
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
}

export const isPostSaved = async ({ userId, postId }) => {
  const savedRef = doc(collection(db, 'users', userId, 'savedPosts'), postId)
  const snapshot = await getDoc(savedRef)
  return snapshot.exists()
}

// Search Posts
export const searchPosts = async ({ query: searchQuery, subject, type, time }) => {
  let q = query(postsCollection, orderBy('createdAt', 'desc'), limit(50))
  
  const snapshot = await getDocs(q)
  let posts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
  
  // Filter client-side (Firestore doesn't support full-text search)
  if (searchQuery) {
    const queryLower = searchQuery.toLowerCase()
    posts = posts.filter((post) => 
      post.text?.toLowerCase().includes(queryLower) ||
      post.author?.displayName?.toLowerCase().includes(queryLower)
    )
  }
  
  // Filter by subject (if tags are implemented)
  if (subject && subject !== 'all') {
    posts = posts.filter((post) => 
      post.tags?.includes(subject) || post.subject === subject
    )
  }
  
  // Filter by type
  if (type && type !== 'all') {
    if (type === 'question') {
      posts = posts.filter((post) => post.text?.includes('?') || post.text?.includes('Đề bài'))
    } else if (type === 'document') {
      posts = posts.filter((post) => post.documentUrl)
    } else if (type === 'discussion') {
      posts = posts.filter((post) => !post.documentUrl && !post.text?.includes('?'))
    }
  }
  
  // Filter by time
  if (time && time !== 'all') {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    posts = posts.filter((post) => {
      const postDate = post.createdAt?.toDate?.() || new Date(post.createdAt)
      if (time === 'today') return postDate >= today
      if (time === 'week') return postDate >= weekAgo
      if (time === 'month') return postDate >= monthAgo
      return true
    })
  }
  
  return posts.filter((post) => !post.isHidden)
}

// Chat History Functions
export const createChatSession = async ({ userId, title, firstMessage }) => {
  // Không dùng serverTimestamp() trong array, dùng Date.now() thay thế
  const now = new Date()
  const sessionRef = await addDoc(chatHistoryCollection, {
    userId,
    title: title || firstMessage?.substring(0, 50) || 'Cuộc trò chuyện mới',
    messages: firstMessage ? [{
      role: 'user',
      content: firstMessage,
      timestamp: now,
    }] : [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return sessionRef.id
}

export const addMessageToSession = async ({ sessionId, role, content }) => {
  const sessionRef = doc(chatHistoryCollection, sessionId)
  const sessionSnap = await getDoc(sessionRef)
  
  if (!sessionSnap.exists()) {
    throw new Error('Session not found')
  }
  
  const currentMessages = sessionSnap.data().messages || []
  // Không dùng serverTimestamp() trong array, dùng Date.now() thay thế
  const now = new Date()
  const newMessage = {
    role,
    content,
    timestamp: now,
  }
  
  await updateDoc(sessionRef, {
    messages: [...currentMessages, newMessage],
    updatedAt: serverTimestamp(),
  })
  
  return newMessage
}

export const getUserChatSessions = async (userId) => {
  const q = query(
    chatHistoryCollection,
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc'),
    limit(50)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }))
}

export const getChatSession = async (sessionId) => {
  const sessionRef = doc(chatHistoryCollection, sessionId)
  const sessionSnap = await getDoc(sessionRef)
  
  if (!sessionSnap.exists()) {
    return null
  }
  
  return {
    id: sessionSnap.id,
    ...sessionSnap.data(),
  }
}

export const deleteChatSession = async (sessionId) => {
  const sessionRef = doc(chatHistoryCollection, sessionId)
  await deleteDoc(sessionRef)
}

export const updateChatSessionTitle = async ({ sessionId, title }) => {
  const sessionRef = doc(chatHistoryCollection, sessionId)
  await updateDoc(sessionRef, {
    title,
    updatedAt: serverTimestamp(),
  })
}

export const watchUserChatSessions = (userId, callback, onError) => {
  try {
    const q = query(
      chatHistoryCollection,
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc'),
      limit(50)
    )
    return onSnapshot(
      q,
      (snapshot) => {
        const sessions = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        callback(sessions)
      },
      (error) => {
        console.error('Error in watchUserChatSessions:', error)
        if (onError) onError(error)
        // Fallback: return empty array
        callback([])
      }
    )
  } catch (error) {
    console.error('Error setting up watchUserChatSessions:', error)
    if (onError) onError(error)
    // Return a no-op unsubscribe function
    return () => {}
  }
}

export const getTeacherNotifications = async (userId) => {
  // Lấy tất cả notifications và filter client-side
  const q = query(
    notificationsCollection,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(20)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((notif) => {
      const type = notif.type || ''
      return type.includes('announcement') || 
             type.includes('teacher') || 
             type.includes('admin') ||
             type === 'solution' // Giải đáp từ giáo viên
    })
    .slice(0, 5)
}

// Notifications
export const createNotification = async ({ userId, type, title, message, postId, commentIndex, relatedUserId }) => {
  await addDoc(notificationsCollection, {
    userId,
    type, // 'mention', 'comment', 'reply', 'solution'
    title,
    message,
    postId: postId || null,
    commentIndex: commentIndex || null,
    relatedUserId: relatedUserId || null,
    read: false,
    createdAt: serverTimestamp(),
  })
}

export const watchNotifications = (userId, callback) => {
  const q = query(
    notificationsCollection,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
  })
}

export const markNotificationAsRead = async (notificationId) => {
  const notifRef = doc(notificationsCollection, notificationId)
  await updateDoc(notifRef, { read: true })
}

export const markAllNotificationsAsRead = async (userId) => {
  const q = query(notificationsCollection, where('userId', '==', userId), where('read', '==', false))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return
  
  const batch = writeBatch(db)
  snapshot.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, { read: true })
  })
  await batch.commit()
}

// Document Management Functions
export const createDocument = async ({ 
  fileName, 
  fileUrl, 
  fileType, 
  fileSize, 
  uploadedBy, 
  description = null,
  tags = []
}) => {
  return addDoc(documentsCollection, {
    fileName,
    fileUrl,
    fileType,
    fileSize,
    uploadedBy,
    description,
    tags,
    downloadCount: 0,
    viewCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export const getDocuments = async (limitCount = 50) => {
  const q = query(
    documentsCollection,
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({ 
    id: docSnap.id, 
    ...docSnap.data() 
  }))
}

export const getDocumentsByUser = async (userId, limitCount = 50) => {
  const q = query(
    documentsCollection,
    where('uploadedBy.uid', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({ 
    id: docSnap.id, 
    ...docSnap.data() 
  }))
}

export const getDocumentsByType = async (fileType, limitCount = 50) => {
  const q = query(
    documentsCollection,
    where('fileType', '==', fileType),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((docSnap) => ({ 
    id: docSnap.id, 
    ...docSnap.data() 
  }))
}

export const searchDocuments = async (searchTerm, limitCount = 50) => {
  const q = query(
    documentsCollection,
    orderBy('createdAt', 'desc'),
    limit(limitCount * 2) // Get more to filter
  )
  const snapshot = await getDocs(q)
  const allDocs = snapshot.docs.map((docSnap) => ({ 
    id: docSnap.id, 
    ...docSnap.data() 
  }))
  
  // Filter by search term (fileName, description, tags)
  const term = searchTerm.toLowerCase()
  return allDocs
    .filter((doc) => 
      doc.fileName?.toLowerCase().includes(term) ||
      doc.description?.toLowerCase().includes(term) ||
      doc.tags?.some((tag) => tag.toLowerCase().includes(term))
    )
    .slice(0, limitCount)
}

export const incrementDocumentViewCount = async (documentId) => {
  const docRef = doc(documentsCollection, documentId)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    const currentCount = docSnap.data().viewCount || 0
    await updateDoc(docRef, {
      viewCount: currentCount + 1,
      updatedAt: serverTimestamp(),
    })
  }
}

export const incrementDocumentDownloadCount = async (documentId) => {
  const docRef = doc(documentsCollection, documentId)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    const currentCount = docSnap.data().downloadCount || 0
    await updateDoc(docRef, {
      downloadCount: currentCount + 1,
      updatedAt: serverTimestamp(),
    })
  }
}

export const deleteDocument = async (documentId) => {
  await deleteDoc(doc(documentsCollection, documentId))
}

export const updateDocument = async ({ documentId, description, tags }) => {
  const docRef = doc(documentsCollection, documentId)
  const updateData = {
    updatedAt: serverTimestamp(),
  }
  if (description !== undefined) updateData.description = description
  if (tags !== undefined) updateData.tags = tags
  await updateDoc(docRef, updateData)
}
