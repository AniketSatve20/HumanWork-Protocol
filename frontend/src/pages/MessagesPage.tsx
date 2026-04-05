import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { Button, Skeleton, EmptyState, Progress } from '@/components/common';
import { useAuthStore } from '@/context/authStore';
import { useMessagesStore } from '@/context/messagesStore';
import { useJobsStore } from '@/context/jobsStore';
import { web3Service } from '@/services/web3.service';
import { formatUSDC, formatRelativeTime, formatAddress, generateAvatar, getMilestoneStatusLabel, getMilestoneStatusColor, calculateProgress, cn } from '@/utils/helpers';
import type { Conversation, Message, Milestone } from '@/types';
import toast from 'react-hot-toast';

function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="h-full overflow-y-auto">
      {conversations.length === 0 ? (
        <div className="p-8 text-center">
          <MessageSquare className="w-12 h-12 text-surface-300 mx-auto mb-3" />
          <p className="text-surface-600">No conversations yet</p>
          <p className="text-sm text-surface-500 mt-1">
            Apply to jobs or hire freelancers to start chatting.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-surface-100">
          {conversations.map((conv) => {
            const otherParticipant = conv.participants[0];
            
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  'w-full p-4 text-left hover:bg-surface-50 transition-colors',
                  selectedId === conv.id && 'bg-primary-50 hover:bg-primary-50'
                )}
              >
                <div className="flex items-start gap-3">
                  <img
                    src={otherParticipant.avatar || generateAvatar(otherParticipant.address)}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-surface-900 truncate">
                        {otherParticipant.name || formatAddress(otherParticipant.address)}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-accent-500 text-white rounded-full">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-primary-600 truncate">{conv.jobTitle}</p>
                    {conv.lastMessage && (
                      <p className="text-sm text-surface-500 truncate mt-1">
                        {conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  if (message.type === 'system' || message.type === 'milestone_update') {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-surface-100 rounded-full px-4 py-2 text-sm text-surface-600 flex items-center gap-2">
          {message.type === 'milestone_update' && <CheckCircle2 className="w-4 h-4 text-success-500" />}
          {message.content}
        </div>
      </div>
    );
  }

  if (message.type === 'payment') {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-success-50 border border-success-200 rounded-xl px-4 py-3 text-sm text-success-700 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Payment of {message.metadata?.amount} processed
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex mb-4', isOwn ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[70%] rounded-2xl px-4 py-3',
        isOwn
          ? 'bg-primary-500 text-white rounded-br-md'
          : 'bg-surface-100 text-surface-900 rounded-bl-md'
      )}>
        <p className="whitespace-pre-wrap">{message.content}</p>
        <p className={cn(
          'text-xs mt-1',
          isOwn ? 'text-primary-200' : 'text-surface-400'
        )}>
          {formatRelativeTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}

function MilestonePanel({
  milestones,
  projectId,
  isClient,
  onAction,
}: {
  milestones: Milestone[];
  projectId: number;
  isClient: boolean;
  onAction: () => void;
}) {
  const [loadingMilestone, setLoadingMilestone] = useState<number | null>(null);

  const handleComplete = async (milestoneId: number) => {
    setLoadingMilestone(milestoneId);
    try {
      toast.loading('Marking milestone as complete...', { id: 'milestone' });
      const tx = await web3Service.completeMilestone(projectId, milestoneId);
      await tx.wait();
      toast.success('Milestone marked as complete!', { id: 'milestone' });
      onAction();
    } catch (error) {
      console.error('Failed to complete milestone:', error);
      toast.error('Failed to complete milestone', { id: 'milestone' });
    } finally {
      setLoadingMilestone(null);
    }
  };

  const handleApprove = async (milestoneId: number) => {
    setLoadingMilestone(milestoneId);
    try {
      toast.loading('Approving milestone...', { id: 'milestone' });
      const tx = await web3Service.approveMilestone(projectId, milestoneId);
      await tx.wait();
      toast.success('Milestone approved! Payment released.', { id: 'milestone' });
      onAction();
    } catch (error) {
      console.error('Failed to approve milestone:', error);
      toast.error('Failed to approve milestone', { id: 'milestone' });
    } finally {
      setLoadingMilestone(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-surface-600">Project Progress</span>
          <span className="font-medium">{calculateProgress(milestones)}%</span>
        </div>
        <Progress value={calculateProgress(milestones)} />
      </div>

      {milestones.map((milestone, index) => (
        <div
          key={index}
          className={cn(
            'p-4 rounded-xl border transition-colors',
            milestone.status === 2
              ? 'bg-success-50 border-success-200'
              : milestone.status === 1
              ? 'bg-warning-50 border-warning-200'
              : 'bg-surface-50 border-surface-200'
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                milestone.status === 2 ? 'bg-success-500 text-white' :
                milestone.status === 1 ? 'bg-warning-500 text-white' :
                'bg-surface-300 text-surface-600'
              )}>
                {milestone.status === 2 ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
              </div>
              <div>
                <p className="font-medium text-surface-900">{milestone.description}</p>
                <p className={cn('text-xs mt-1', getMilestoneStatusColor(milestone.status))}>
                  {getMilestoneStatusLabel(milestone.status)}
                </p>
              </div>
            </div>
            <span className="font-semibold text-surface-900">{formatUSDC(milestone.amount)}</span>
          </div>

          {/* Actions */}
          <div className="mt-3 flex gap-2">
            {!isClient && milestone.status === 0 && (
              <Button
                size="sm"
                onClick={() => handleComplete(index)}
                isLoading={loadingMilestone === index}
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark Complete
              </Button>
            )}
            {isClient && milestone.status === 1 && (
              <>
                <Button
                  size="sm"
                  onClick={() => handleApprove(index)}
                  isLoading={loadingMilestone === index}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve & Pay
                </Button>
                <Button size="sm" variant="ghost">
                  <AlertTriangle className="w-4 h-4" />
                  Dispute
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessagesPage() {
  const [searchParams] = useSearchParams();
  const { address } = useAuthStore();
  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    isSending,
    fetchConversations,
    fetchConversation,
    fetchMessages,
    sendMessage,
    markAsRead,
    initSocket,
    cleanupSocket,
    joinRoom,
    leaveRoom,
  } = useMessagesStore();
  const { currentJob, fetchJob } = useJobsStore();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    searchParams.get('conversation')
  );
  const [messageInput, setMessageInput] = useState('');
  const [showMilestones, setShowMilestones] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevConversationId = useRef<string | null>(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    initSocket();
    return () => {
      cleanupSocket();
    };
  }, [initSocket, cleanupSocket]);

  // Handle ?job= param - find existing conversation or prompt to start one
  useEffect(() => {
    const jobIdParam = searchParams.get('job');
    if (jobIdParam && conversations.length > 0 && !selectedConversationId) {
      const jobId = parseInt(jobIdParam);
      // Find conversation for this job
      const existingConv = conversations.find(c => c.jobId === jobId);
      if (existingConv) {
        setSelectedConversationId(existingConv.id);
      }
    }
  }, [searchParams, conversations, selectedConversationId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selectedConversationId) {
      // Leave the previous room
      if (prevConversationId.current && prevConversationId.current !== selectedConversationId) {
        leaveRoom(prevConversationId.current);
      }
      // Join the new room
      joinRoom(selectedConversationId);
      prevConversationId.current = selectedConversationId;

      fetchConversation(selectedConversationId);
      fetchMessages(selectedConversationId);
      markAsRead(selectedConversationId);
    }
  }, [selectedConversationId, fetchConversation, fetchMessages, markAsRead, joinRoom, leaveRoom]);

  useEffect(() => {
    if (currentConversation?.jobId) {
      fetchJob(currentConversation.jobId);
    }
  }, [currentConversation?.jobId, fetchJob]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedConversationId) return;
    
    await sendMessage(selectedConversationId, messageInput.trim());
    setMessageInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isClient = currentJob?.client === address;
  const otherParticipant = currentConversation?.participants.find(
    (p) => p.address !== address
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Conversations List */}
      <div className="w-80 border-r border-surface-200/50 bg-surface-100 flex-shrink-0">
        <div className="p-4 border-b border-surface-200">
          <h2 className="font-semibold text-surface-900">Messages</h2>
        </div>
        {isLoading && !conversations.length ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversationId}
            onSelect={setSelectedConversationId}
          />
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-surface-50">
        {selectedConversationId && currentConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-surface-100/80 backdrop-blur-sm border-b border-surface-200/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={otherParticipant?.avatar || generateAvatar(otherParticipant?.address || '')}
                  alt=""
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-medium text-surface-900">
                    {otherParticipant?.name || formatAddress(otherParticipant?.address || '')}
                  </p>
                  <p className="text-sm text-primary-600">{currentConversation.jobTitle}</p>
                </div>
              </div>
              <Button
                variant={showMilestones ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowMilestones(!showMilestones)}
              >
                <FileText className="w-4 h-4" />
                Milestones
              </Button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Messages */}
              <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isOwn={message.sender === address}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 bg-surface-100/80 backdrop-blur-sm border-t border-surface-200/50">
                  <div className="flex gap-2">
                    <textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type your message..."
                      rows={1}
                      className="input flex-1 resize-none min-h-[44px] max-h-32"
                    />
                    <Button onClick={handleSend} disabled={!messageInput.trim() || isSending}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Milestones Panel */}
              <AnimatePresence>
                {showMilestones && currentJob && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 320, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="border-l border-surface-200/50 bg-surface-100 overflow-hidden"
                  >
                    <div className="w-80 p-4 h-full overflow-y-auto">
                      <h3 className="font-semibold text-surface-900 mb-4">Project Milestones</h3>
                      <MilestonePanel
                        milestones={currentJob.milestones}
                        projectId={currentJob.id}
                        isClient={isClient}
                        onAction={() => fetchJob(currentJob.id)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={<MessageSquare className="w-16 h-16" />}
              title="Select a conversation"
              description="Choose a conversation from the list to start messaging."
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default MessagesPage;