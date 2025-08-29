// 



import mongoose from 'mongoose';
import Conversation from '../module/conversation/conversation.model';
import User from '../module/user/user.model';

export const getConversationList = async (
  userId: string,
  onlineUsers: Set<string>,
  query: any
) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const searchTerm = query.searchTerm as string;
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 15;
  const skip = (page - 1) * limit;

  let userFilter: any = {};
  if (searchTerm) {
    const matchingUsers = await User.find(
      { name: { $regex: searchTerm, $options: 'i' } },
      '_id'
    );
    const matchingUserIds = matchingUsers.map((u) => u._id);
    if (matchingUserIds.length > 0) {
      userFilter = { participants: { $in: matchingUserIds } };
    } else {
      userFilter = { _id: null }; 
    }
  }

  const conversations = await Conversation.aggregate([
    { $match: { participants: userObjectId, ...userFilter } },

    {
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [
          { $sort: { updatedAt: -1 } },
          { $skip: skip },
          { $limit: limit },

          // Lookup participants
          {
            $lookup: {
              from: 'users',
              localField: 'participants',
              foreignField: '_id',
              as: 'participantsData',
            },
          },
          // Lookup last message
          {
            $lookup: {
              from: 'messages',
              localField: 'lastMessage',
              foreignField: '_id',
              as: 'lastMessageData',
            },
          },
          { $unwind: { path: '$lastMessageData', preserveNullAndEmptyArrays: true } },
          // Count unseen messages
          {
            $lookup: {
              from: 'messages',
              let: { convId: '$_id' },
              pipeline: [
                { $match: { $expr: { $eq: ['$conversationId', '$$convId'] } } },
                { $match: { msgByUserId: { $ne: userObjectId }, seen: false } },
                { $count: 'unseenCount' },
              ],
              as: 'unseenData',
            },
          },
          {
            $addFields: {
              unseenMsg: { $arrayElemAt: ['$unseenData.unseenCount', 0] },
              otherUser: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: '$participantsData',
                      cond: { $ne: ['$$this._id', userObjectId] },
                    },
                  },
                  0,
                ],
              },
            },
          },
          {
            $project: {
              conversationId: '$_id',
              unseenMsg: { $ifNull: ['$unseenMsg', 0] },
              userData: {
                userId: '$otherUser._id',
                name: '$otherUser.name',
                profileImage: '$otherUser.photo',
                online: {
                  $in: [
                    '$otherUser._id',
                    Array.from(onlineUsers).map((id) => new mongoose.Types.ObjectId(id)),
                  ],
                },
              },
              lastMsg: {
                $cond: {
                  if: '$lastMessageData',
                  then: {
                    _id: '$lastMessageData._id',
                    text: {
                      $cond: {
                        if: { $ifNull: ['$lastMessageData.text', false] },
                        then: '$lastMessageData.text',
                        else: {
                          $concat: [
                            'send ',
                            { $toString: { $size: { $ifNull: ['$lastMessageData.imageUrl', []] } } },
                            ' file',
                          ],
                        },
                      },
                    },
                    imageUrl: '$lastMessageData.imageUrl',
                    createdAt: '$lastMessageData.createdAt',
                  },
                  else: null,
                },
              },
            },
          },
        ],
      },
    },
  ]);

  const total = conversations[0].metadata[0]?.total || 0;
  const totalPages = Math.ceil(total / limit);

  return {
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
    conversations: conversations[0].data,
  };
};
