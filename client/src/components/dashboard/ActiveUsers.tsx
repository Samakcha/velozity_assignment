import React, { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { connectSocket, getActiveUsersCount, PresenceUpdateEvent } from '../../socket/socket';

export const ActiveUsers: React.FC = () => {
  const { accessToken } = useAuth();
  const [activeCount, setActiveCount] = useState<number>(1);

  useEffect(() => {
    if (!accessToken) return;

    const socket = connectSocket(accessToken);

    // Initial count fetch
    getActiveUsersCount((data) => {
      if (data && typeof data.count === 'number') {
        setActiveCount(data.count);
      }
    });

    const handlePresence = (event: PresenceUpdateEvent) => {
      if (event && typeof event.activeUserCount === 'number') {
        setActiveCount(event.activeUserCount);
      }
    };

    socket.on('presence_update', handlePresence);

    return () => {
      socket.off('presence_update', handlePresence);
    };
  }, [accessToken]);

  return (
    <div className="active-users-card">
      <div className="presence-indicator">
        <span className="live-pulse"></span>
        <span className="count-number">{activeCount}</span>
      </div>
      <div className="presence-info">
        <div className="presence-label">Active Users Online</div>
        <div className="presence-subtext">Real-time Socket.io presence</div>
      </div>
    </div>
  );
};
