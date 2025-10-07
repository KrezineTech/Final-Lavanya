-- Sample Seed Data for Messaging System Testing
-- This provides realistic test data for development and testing

-- Insert sample message threads
INSERT INTO "MessageThread" (
    subject,
    "senderName",
    "senderEmail",
    "senderAvatar",
    "isPreviousBuyer",
    "isOrderHelp",
    folder,
    read,
    "privateNote",
    "mostRecentOrderId",
    "totalPurchased",
    "createdAt",
    "updatedAt"
) VALUES 
(
    'Question about my custom Ganesh painting order',
    'Priya Patel',
    'priya.patel@email.com',
    'https://i.pravatar.cc/150?u=priya',
    true,
    true,
    'INBOX',
    false,
    'Customer seems very interested in custom framing options. Follow up in a week.',
    'ord_3663677612',
    'US$ 1,071.68',
    NOW() - INTERVAL '2 days',
    NOW() - INTERVAL '2 days'
),
(
    'Shipping timeline for international order',
    'James Chen',
    'james.chen@email.com',
    'https://i.pravatar.cc/150?u=james',
    false,
    true,
    'INBOX',
    false,
    '',
    NULL,
    NULL,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '1 day'
),
(
    'Commission request for family portrait',
    'Sarah Johnson',
    'sarah.j@email.com',
    'https://i.pravatar.cc/150?u=sarah',
    true,
    false,
    'INBOX',
    true,
    'Potential high-value commission. Schedule video call.',
    'ord_1234567890',
    'US$ 2,450.00',
    NOW() - INTERVAL '3 days',
    NOW() - INTERVAL '1 day'
),
(
    'Product quality feedback',
    'Michael Rodriguez',
    'mike.rod@email.com',
    'https://i.pravatar.cc/150?u=mike',
    true,
    false,
    'ARCHIVE',
    true,
    'Very satisfied customer. Good for testimonials.',
    'ord_9876543210',
    'US$ 850.00',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '7 days'
),
(
    'Spam: Cheap paintings available!',
    'Suspicious Seller',
    'spam@fakeart.com',
    'https://i.pravatar.cc/150?u=spam',
    false,
    false,
    'SPAM',
    false,
    'Marked as spam - potential scammer.',
    NULL,
    NULL,
    NOW() - INTERVAL '5 days',
    NOW() - INTERVAL '5 days'
);

-- Get the IDs of the inserted threads for conversation messages
DO $$
DECLARE
    thread_1_id INT;
    thread_2_id INT;
    thread_3_id INT;
    thread_4_id INT;
BEGIN
    -- Get thread IDs
    SELECT id INTO thread_1_id FROM "MessageThread" WHERE "senderEmail" = 'priya.patel@email.com';
    SELECT id INTO thread_2_id FROM "MessageThread" WHERE "senderEmail" = 'james.chen@email.com';
    SELECT id INTO thread_3_id FROM "MessageThread" WHERE "senderEmail" = 'sarah.j@email.com';
    SELECT id INTO thread_4_id FROM "MessageThread" WHERE "senderEmail" = 'mike.rod@email.com';

    -- Insert conversation messages for thread 1 (Priya Patel)
    INSERT INTO "ConversationMessage" ("threadId", "authorRole", "authorName", "authorAvatar", content, "contentHtml", "createdAt", "isSystem") VALUES
    (thread_1_id, 'CUSTOMER', 'Priya Patel', 'https://i.pravatar.cc/150?u=priya', 
     'Hi, I recently ordered a custom Ganesh painting from you. Could you please let me know the expected delivery timeline? I''m hoping to receive it before the upcoming festival season. Also, I''m interested in custom framing options if available. Thank you!', 
     '<p>Hi, I recently ordered a custom Ganesh painting from you. Could you please let me know the expected delivery timeline? I''m hoping to receive it before the upcoming festival season. Also, I''m interested in custom framing options if available. Thank you!</p>', 
     NOW() - INTERVAL '2 days', false),
    
    (thread_1_id, 'SUPPORT', 'Art Studio Support', 'https://i.pravatar.cc/150?u=support', 
     'Hello Priya! Thank you for your order. Your custom Ganesh painting is currently in progress and should be completed within 7-10 business days. For framing options, we offer traditional wooden frames in gold, silver, and natural wood finishes. I''ll send you a catalog shortly. The framing would add an additional 3-4 days to the delivery timeline.', 
     '<p>Hello Priya! Thank you for your order. Your custom Ganesh painting is currently in progress and should be completed within 7-10 business days. For framing options, we offer traditional wooden frames in gold, silver, and natural wood finishes. I''ll send you a catalog shortly. The framing would add an additional 3-4 days to the delivery timeline.</p>', 
     NOW() - INTERVAL '2 days' + INTERVAL '30 minutes', false);

    -- Insert conversation messages for thread 2 (James Chen)
    INSERT INTO "ConversationMessage" ("threadId", "authorRole", "authorName", "authorAvatar", content, "contentHtml", "createdAt", "isSystem") VALUES
    (thread_2_id, 'CUSTOMER', 'James Chen', 'https://i.pravatar.cc/150?u=james', 
     'I''m interested in purchasing one of your landscape paintings for shipping to Canada. What are the typical shipping times and costs for international delivery? Also, do you handle customs documentation?', 
     '<p>I''m interested in purchasing one of your landscape paintings for shipping to Canada. What are the typical shipping times and costs for international delivery? Also, do you handle customs documentation?</p>', 
     NOW() - INTERVAL '1 day', false);

    -- Insert conversation messages for thread 3 (Sarah Johnson)
    INSERT INTO "ConversationMessage" ("threadId", "authorRole", "authorName", "authorAvatar", content, "contentHtml", "createdAt", "isSystem") VALUES
    (thread_3_id, 'CUSTOMER', 'Sarah Johnson', 'https://i.pravatar.cc/150?u=sarah', 
     'I''m looking to commission a family portrait painting. We are a family of 5 and would like a traditional style portrait. Could you provide information about your commission process, timeline, and pricing? I have high-resolution photos available.', 
     '<p>I''m looking to commission a family portrait painting. We are a family of 5 and would like a traditional style portrait. Could you provide information about your commission process, timeline, and pricing? I have high-resolution photos available.</p>', 
     NOW() - INTERVAL '3 days', false),
     
    (thread_3_id, 'SUPPORT', 'Art Studio Support', 'https://i.pravatar.cc/150?u=support', 
     'Hello Sarah! I''d be delighted to work on your family portrait. For a family of 5 in traditional style, the pricing starts at $1,200 for a 16x20 canvas. The process involves: 1) Photo review and composition planning, 2) Initial sketch approval, 3) Painting process (4-6 weeks), 4) Final review and shipping. Would you like to schedule a video call to discuss the details?', 
     '<p>Hello Sarah! I''d be delighted to work on your family portrait. For a family of 5 in traditional style, the pricing starts at $1,200 for a 16x20 canvas. The process involves: 1) Photo review and composition planning, 2) Initial sketch approval, 3) Painting process (4-6 weeks), 4) Final review and shipping. Would you like to schedule a video call to discuss the details?</p>', 
     NOW() - INTERVAL '2 days', false),
     
    (thread_3_id, 'CUSTOMER', 'Sarah Johnson', 'https://i.pravatar.cc/150?u=sarah', 
     'That sounds perfect! Yes, I''d love to schedule a video call. I''m available most weekday evenings after 6 PM EST. Please let me know what works best for you. Also, do you offer any canvas size options larger than 16x20?', 
     '<p>That sounds perfect! Yes, I''d love to schedule a video call. I''m available most weekday evenings after 6 PM EST. Please let me know what works best for you. Also, do you offer any canvas size options larger than 16x20?</p>', 
     NOW() - INTERVAL '1 day', false);

    -- Insert conversation messages for thread 4 (Michael Rodriguez)
    INSERT INTO "ConversationMessage" ("threadId", "authorRole", "authorName", "authorAvatar", content, "contentHtml", "createdAt", "isSystem") VALUES
    (thread_4_id, 'CUSTOMER', 'Michael Rodriguez', 'https://i.pravatar.cc/150?u=mike', 
     'I wanted to share my feedback on the painting I received last week. The quality exceeded my expectations! The colors are vibrant, the brushwork is excellent, and the packaging was very secure. I''ll definitely be ordering again and recommending your work to friends. Thank you for the beautiful art piece!', 
     '<p>I wanted to share my feedback on the painting I received last week. The quality exceeded my expectations! The colors are vibrant, the brushwork is excellent, and the packaging was very secure. I''ll definitely be ordering again and recommending your work to friends. Thank you for the beautiful art piece!</p>', 
     NOW() - INTERVAL '7 days', false),
     
    (thread_4_id, 'SUPPORT', 'Art Studio Support', 'https://i.pravatar.cc/150?u=support', 
     'Michael, thank you so much for this wonderful feedback! It means the world to hear that you''re happy with your painting. We put a lot of care into each piece and the packaging process. We''d love to feature your testimonial on our website if you''re comfortable with that. Looking forward to your next order!', 
     '<p>Michael, thank you so much for this wonderful feedback! It means the world to hear that you''re happy with your painting. We put a lot of care into each piece and the packaging process. We''d love to feature your testimonial on our website if you''re comfortable with that. Looking forward to your next order!</p>', 
     NOW() - INTERVAL '7 days' + INTERVAL '2 hours', false);

END $$;

-- Insert sample quick replies
INSERT INTO "QuickReply" (title, name, content, "savedCount", "createdBy", "createdAt", "updatedAt") VALUES
('Order Status Update', 'Status update', 'Hello! Your order is currently in progress. I will update you with tracking information once it ships. Expected completion time is 7-10 business days. Thank you for your patience!', 8, 'admin', NOW(), NOW()),
('Shipping Information', 'Shipping details', 'We offer worldwide shipping. Domestic orders typically take 3-5 business days, while international orders take 7-14 business days. All items are carefully packaged to ensure safe delivery. Tracking information will be provided once shipped.', 12, 'admin', NOW(), NOW()),
('Custom Commission Process', 'Commission process', 'Thank you for your interest in a custom commission! Our process includes: 1) Initial consultation, 2) Sketch approval, 3) Progress updates, 4) Final review. Timeline is typically 4-6 weeks. Pricing starts at $500 for smaller pieces. Would you like to schedule a consultation?', 5, 'admin', NOW(), NOW()),
('Return Policy', 'Returns and exchanges', 'We want you to love your artwork! If you''re not completely satisfied, we offer a 30-day return policy for original condition items. Custom commissions have a different policy due to their personalized nature. Please contact us for specific return questions.', 15, 'admin', NOW(), NOW()),
('International Customs', 'Customs information', 'For international orders, please note that customs duties and taxes may apply based on your country''s regulations. We declare the full value of artwork for customs purposes. We handle all necessary customs documentation from our end.', 6, 'admin', NOW(), NOW());

-- Insert sample labels
INSERT INTO "Label" (name, color, "createdBy", "createdAt") VALUES
('High Priority', '#ef4444', 'admin', NOW()),
('Commission Request', '#f59e0b', 'admin', NOW()),
('Previous Customer', '#10b981', 'admin', NOW()),
('International', '#3b82f6', 'admin', NOW()),
('Shipping Issue', '#f97316', 'admin', NOW()),
('Positive Feedback', '#22c55e', 'admin', NOW());

-- Apply some labels to threads
DO $$
DECLARE
    high_priority_label_id INT;
    commission_label_id INT;
    previous_customer_label_id INT;
    international_label_id INT;
    positive_feedback_label_id INT;
    thread_1_id INT;
    thread_2_id INT;
    thread_3_id INT;
    thread_4_id INT;
BEGIN
    -- Get label IDs
    SELECT id INTO high_priority_label_id FROM "Label" WHERE name = 'High Priority';
    SELECT id INTO commission_label_id FROM "Label" WHERE name = 'Commission Request';
    SELECT id INTO previous_customer_label_id FROM "Label" WHERE name = 'Previous Customer';
    SELECT id INTO international_label_id FROM "Label" WHERE name = 'International';
    SELECT id INTO positive_feedback_label_id FROM "Label" WHERE name = 'Positive Feedback';
    
    -- Get thread IDs
    SELECT id INTO thread_1_id FROM "MessageThread" WHERE "senderEmail" = 'priya.patel@email.com';
    SELECT id INTO thread_2_id FROM "MessageThread" WHERE "senderEmail" = 'james.chen@email.com';
    SELECT id INTO thread_3_id FROM "MessageThread" WHERE "senderEmail" = 'sarah.j@email.com';
    SELECT id INTO thread_4_id FROM "MessageThread" WHERE "senderEmail" = 'mike.rod@email.com';

    -- Apply labels to threads
    INSERT INTO "MessageLabel" ("threadId", "labelId", "createdAt") VALUES
    (thread_1_id, previous_customer_label_id, NOW()),
    (thread_2_id, international_label_id, NOW()),
    (thread_3_id, commission_label_id, NOW()),
    (thread_3_id, high_priority_label_id, NOW()),
    (thread_4_id, previous_customer_label_id, NOW()),
    (thread_4_id, positive_feedback_label_id, NOW());
END $$;

-- Update schema statistics
ANALYZE "MessageThread";
ANALYZE "ConversationMessage";
ANALYZE "QuickReply";
ANALYZE "Label";
ANALYZE "MessageLabel";