import { Box, Heading, Text, Link, ListItem, UnorderedList } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { SiteHeader, SiteFooter } from './Landing';
import { BRAND, CONTACT_EMAIL } from '../config';

const UPDATED = '05/11/2026';

function Section({ title, children }) {
  return (
    <Box mt="28px">
      <Heading as="h2" fontSize="20px" fontWeight={800} mb="8px">{title}</Heading>
      <Box color="app.soft" fontSize="16px" lineHeight="1.7" sx={{ p: { mb: '8px' } }}>{children}</Box>
    </Box>
  );
}

function Contact() {
  return CONTACT_EMAIL
    ? <Text>Liên hệ: <Link href={`mailto:${CONTACT_EMAIL}`} color="#1899D6">{CONTACT_EMAIL}</Link>.</Text>
    : <Text>Bạn có thể liên hệ đội ngũ vận hành qua các kênh cộng đồng được giới thiệu trong ứng dụng.</Text>;
}

function Page({ title, children }) {
  return (
    <Box minH="100vh">
      <SiteHeader />
      <Box as="main" maxW="760px" mx="auto" px="20px" py="40px">
        <Heading as="h1" fontSize={{ base: '30px', md: '38px' }} fontWeight={900}>{title}</Heading>
        <Text color="app.muted" mt="6px">Cập nhật lần cuối: {UPDATED}</Text>
        {children}
      </Box>
      <SiteFooter />
    </Box>
  );
}

export function Terms() {
  return (
    <Page title="Điều khoản sử dụng">
      <Section title="1. Giới thiệu">
        <Text>{BRAND} là ứng dụng web giúp bạn học từ vựng tiếng Anh. Khi tạo tài khoản hoặc sử dụng {BRAND}, bạn đồng ý với các điều khoản dưới đây và <Link as={RouterLink} to="/privacy" color="#1899D6">Chính sách quyền riêng tư</Link>.</Text>
      </Section>
      <Section title="2. Tài khoản">
        <UnorderedList spacing="4px">
          <ListItem>Bạn đăng nhập bằng email (mã xác thực một lần) hoặc tài khoản Google, và chịu trách nhiệm giữ an toàn cho email của mình.</ListItem>
          <ListItem>Mỗi người chỉ nên dùng một tài khoản. Không dùng công cụ tự động để kiếm xu, leo bảng xếp hạng hoặc gây quá tải hệ thống.</ListItem>
          <ListItem>Bạn có thể xóa tài khoản bất cứ lúc nào trong phần Hồ sơ.</ListItem>
        </UnorderedList>
      </Section>
      <Section title="3. Miễn phí, xu và vật phẩm">
        <Text>{BRAND} không thu phí và không có gói trả phí. Xu chỉ kiếm được khi học, không mua được bằng tiền, không quy đổi ra tiền và không chuyển nhượng. Vật phẩm trong Cửa hàng chỉ có giá trị trang trí trong ứng dụng. Chúng tôi có thể điều chỉnh giá xu hoặc danh mục vật phẩm để giữ cân bằng.</Text>
      </Section>
      <Section title="4. Nội dung của bạn">
        <UnorderedList spacing="4px">
          <ListItem>Bạn giữ quyền với từ vựng, câu ví dụ, ảnh tải lên và tin nhắn của mình.</ListItem>
          <ListItem>Khi bạn công khai thư mục, chia sẻ link hoặc chia sẻ tài liệu trong lớp, người nhận được xem và sao chép nội dung đó vào tài khoản của họ.</ListItem>
          <ListItem>Không đăng nội dung vi phạm pháp luật, xúc phạm, quấy rối, spam hoặc vi phạm bản quyền của người khác (ví dụ sao chép nguyên bộ dữ liệu trả phí của dịch vụ khác). Chúng tôi có thể gỡ nội dung vi phạm.</ListItem>
        </UnorderedList>
      </Section>
      <Section title="5. Tính năng AI">
        <Text>Tính năng AI (tạo từ vựng, đọc chữ trong ảnh, chấm câu, dịch câu ví dụ) có thể sai. Hãy kiểm tra lại trước khi lưu. Mỗi tài khoản có cùng giới hạn lượt AI mỗi ngày.</Text>
      </Section>
      <Section title="6. Lớp học">
        <Text>Giáo viên tạo lớp chịu trách nhiệm với tài liệu và bài tập mình giao. Học sinh khi vào lớp đồng ý cho giáo viên xem tên, email, kết quả bài tập, số từ đã học và lịch hoạt động học tập của mình. Học sinh có thể rời lớp bất cứ lúc nào.</Text>
      </Section>
      <Section title="7. Giới hạn trách nhiệm">
        <Text>Dịch vụ được cung cấp “nguyên trạng”. Chúng tôi cố gắng giữ dịch vụ ổn định và sao lưu dữ liệu, nhưng không cam kết dịch vụ luôn hoạt động liên tục hoặc không có lỗi. Bạn nên xuất các bộ từ quan trọng ra CSV/Excel để lưu riêng.</Text>
      </Section>
      <Section title="8. Thay đổi điều khoản">
        <Text>Khi điều khoản thay đổi, ngày cập nhật ở đầu trang sẽ được sửa. Nếu bạn tiếp tục sử dụng sau đó nghĩa là bạn đồng ý với điều khoản mới.</Text>
        <Contact />
      </Section>
    </Page>
  );
}

export function Privacy() {
  return (
    <Page title="Chính sách quyền riêng tư">
      <Section title="1. Dữ liệu chúng tôi lưu">
        <UnorderedList spacing="4px">
          <ListItem><b>Tài khoản:</b> email, tên hiển thị, ảnh đại diện Google (nếu đăng nhập bằng Google).</ListItem>
          <ListItem><b>Nội dung học tập:</b> thư mục, bộ từ, từ vựng, tiến độ ôn tập, lịch sử luyện tập, xu và vật phẩm.</ListItem>
          <ListItem><b>Nội dung bạn gửi:</b> ảnh tải lên ở Cửa hàng, tin nhắn trò chuyện cộng đồng, lớp học và bài làm.</ListItem>
          <ListItem><b>Cài đặt:</b> giọng đọc, tốc độ, cài đặt game, giao diện đang dùng.</ListItem>
        </UnorderedList>
        <Text mt="8px">Chúng tôi không thu thập dữ liệu thanh toán (không có thanh toán), không bán dữ liệu và không dùng quảng cáo hay công cụ theo dõi của bên thứ ba.</Text>
      </Section>
      <Section title="2. Cookie và lưu trữ trên trình duyệt">
        <Text>Chúng tôi dùng một cookie đăng nhập (httpOnly) để giữ phiên trong 60 ngày. Một số tùy chọn giao diện (thu gọn thanh bên, cài đặt game) được lưu trong localStorage của trình duyệt.</Text>
      </Section>
      <Section title="3. Ai thấy dữ liệu của bạn">
        <UnorderedList spacing="4px">
          <ListItem>Bảng xếp hạng, chuỗi chung và trò chuyện cộng đồng hiển thị tên và ảnh đại diện của bạn cho người dùng khác.</ListItem>
          <ListItem>Thư mục bạn bật “Công khai” và nội dung bạn chia sẻ bằng link được người khác xem và sao chép.</ListItem>
          <ListItem>Giáo viên của lớp bạn tham gia xem được email, kết quả bài tập, số từ đã học và lịch hoạt động của bạn.</ListItem>
        </UnorderedList>
      </Section>
      <Section title="4. Dịch vụ bên thứ ba">
        <UnorderedList spacing="4px">
          <ListItem><b>Google:</b> xác minh đăng nhập khi bạn chọn “Đăng nhập với Google”.</ListItem>
          <ListItem><b>Dịch vụ gửi email:</b> gửi mã đăng nhập tới email của bạn.</ListItem>
          <ListItem><b>Anthropic (Claude):</b> chỉ khi bạn dùng tính năng AI, nội dung bạn gửi cho AI (chủ đề, đoạn văn, ảnh, câu tự đặt, câu ví dụ cần dịch) được chuyển tới API của Anthropic để xử lý.</ListItem>
        </UnorderedList>
      </Section>
      <Section title="5. Quyền của bạn">
        <UnorderedList spacing="4px">
          <ListItem>Xem và sửa dữ liệu của bạn ngay trong ứng dụng; xuất bộ từ ra CSV/Excel.</ListItem>
          <ListItem>Xóa tài khoản trong Hồ sơ → “Xóa tài khoản”: tài khoản và dữ liệu gắn với tài khoản (bộ từ, tiến độ, lớp do bạn tạo, ảnh tải lên, tin nhắn) bị xóa vĩnh viễn. Bản sao mà người khác đã sao chép từ nội dung bạn chia sẻ thuộc về tài khoản của họ.</ListItem>
        </UnorderedList>
      </Section>
      <Section title="6. Bảo mật và lưu giữ">
        <Text>Dữ liệu được lưu trên máy chủ của đơn vị vận hành, truyền qua HTTPS. Dữ liệu được giữ tới khi bạn xóa tài khoản. Mã đăng nhập email hết hạn sau 10 phút.</Text>
      </Section>
      <Section title="7. Trẻ em">
        <Text>Học sinh dưới 16 tuổi nên sử dụng {BRAND} với sự đồng ý và hướng dẫn của cha mẹ hoặc giáo viên.</Text>
        <Contact />
      </Section>
    </Page>
  );
}
