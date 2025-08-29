import Conversation from "../../module/conversation/conversation.model";
import Message from "../../module/message/message.model";
import QueryBuilder from "../../app/builder/QueryBuilder";
import { Socket } from "socket.io";

export const handleMessagePage = async (
  socket:Socket,
  onlineUsers:Set<string>,
  currentUserId:string,
  data:any
) => {
  const { conversationId, page = 1, limit = 5, search = "" } = data;

  const conversation = await Conversation.findById(conversationId).populate(
    "participants",
    "-password"
  );

  if (!conversation) {
    return socket.emit("socket-error", {
      event: "message-page",
      message: "Conversation not found",
    });
  }

  const otherUser: any = conversation.participants.find(
    (u: any) => u._id.toString() !== currentUserId
  );

  const payload = {
    receiverId: otherUser._id,
    name: otherUser.name,
    profileImage: otherUser?.photo,
    online: onlineUsers.has(otherUser._id.toString()),
  };

  socket.emit("message-user", payload);

  const messageQuery = new QueryBuilder(Message.find({ conversationId }), {
    page,
    limit,
    search,
  })
    .search(["text"])
    .sort()
    .paginate();

  const result = await messageQuery.modelQuery;
  const meta = await messageQuery.countTotal();

  socket.emit("messages", {
    conversationId,
    userData: payload,
    messages: result.reverse(),
    meta,
  });

  socket.join(conversationId.toString());
};
