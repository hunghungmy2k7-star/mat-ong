// Bộ lộ trình khởi đầu do Mật Ong tự soạn (từ vựng cơ bản, câu ví dụ tự viết).
// Định dạng mỗi dòng: từ | phiên âm | loại từ | nghĩa | ví dụ
export const STARTER_PATHS = [
  {
    group: 'Theo level', slug: 'a1', name: 'A1 (0-3.0)', difficulty: 1,
    description: 'Dành cho người mới bắt đầu học tiếng Anh',
    sets: {
      'Số đếm': `one|/wʌn/|number|một|I have one brother.
two|/tuː/|number|hai|She has two cats.
three|/θriː/|number|ba|We need three chairs.
four|/fɔːr/|number|bốn|A car has four wheels.
five|/faɪv/|number|năm|I wake up at five o'clock.
ten|/ten/|number|mười|There are ten students in the room.
twenty|/ˈtwen.ti/|number|hai mươi|He is twenty years old.
fifty|/ˈfɪf.ti/|number|năm mươi|This book costs fifty thousand dong.
hundred|/ˈhʌn.drəd/|number|trăm|A hundred people came to the party.
thousand|/ˈθaʊ.zənd/|number|nghìn|The city has a thousand trees.`,
      'Màu sắc': `red|/red/|adjective|màu đỏ|She is wearing a red dress.
blue|/bluː/|adjective|màu xanh dương|The sky is blue today.
green|/ɡriːn/|adjective|màu xanh lá|Grass is green.
yellow|/ˈjel.oʊ/|adjective|màu vàng|Bananas are yellow.
black|/blæk/|adjective|màu đen|My cat is black.
white|/waɪt/|adjective|màu trắng|Snow is white.
orange|/ˈɔːr.ɪndʒ/|adjective|màu cam|He likes orange juice.
pink|/pɪŋk/|adjective|màu hồng|The flowers are pink.
brown|/braʊn/|adjective|màu nâu|She has brown eyes.
grey|/ɡreɪ/|adjective|màu xám|It is a grey morning.`,
      'Chào hỏi': `hello|/həˈloʊ/|interjection|xin chào|Hello, my name is Lan.
goodbye|/ˌɡʊdˈbaɪ/|interjection|tạm biệt|Goodbye, see you tomorrow.
please|/pliːz/|adverb|làm ơn|Please sit down.
thank you|/ˈθæŋk juː/|phrase|cảm ơn|Thank you for your help.
sorry|/ˈsɑːr.i/|adjective|xin lỗi|Sorry, I am late.
welcome|/ˈwel.kəm/|adjective|chào mừng|Welcome to our home.
good morning|/ɡʊd ˈmɔːr.nɪŋ/|phrase|chào buổi sáng|Good morning, teacher.
good night|/ɡʊd ˈnaɪt/|phrase|chúc ngủ ngon|Good night, Mom.
excuse me|/ɪkˈskjuːz miː/|phrase|xin lỗi (để hỏi/nhờ)|Excuse me, where is the bank?
nice to meet you|/naɪs tə miːt juː/|phrase|rất vui được gặp bạn|Hi Tom, nice to meet you.`,
      'Ngày trong tuần': `Monday|/ˈmʌn.deɪ/|noun|thứ Hai|I go to school on Monday.
Tuesday|/ˈtuːz.deɪ/|noun|thứ Ba|We have English on Tuesday.
Wednesday|/ˈwenz.deɪ/|noun|thứ Tư|The shop closes early on Wednesday.
Thursday|/ˈθɝːz.deɪ/|noun|thứ Năm|My birthday is on Thursday.
Friday|/ˈfraɪ.deɪ/|noun|thứ Sáu|Friday is my favourite day.
Saturday|/ˈsæt̬.ɚ.deɪ/|noun|thứ Bảy|We play football on Saturday.
Sunday|/ˈsʌn.deɪ/|noun|Chủ nhật|My family has lunch together on Sunday.
weekend|/ˈwiːk.end/|noun|cuối tuần|What did you do at the weekend?
today|/təˈdeɪ/|adverb|hôm nay|Today is a sunny day.
tomorrow|/təˈmɑːr.oʊ/|adverb|ngày mai|See you tomorrow.`,
      'Thời tiết': `sunny|/ˈsʌn.i/|adjective|nắng|It is sunny and warm today.
rainy|/ˈreɪ.ni/|adjective|có mưa|Take an umbrella, it is rainy.
cloudy|/ˈklaʊ.di/|adjective|nhiều mây|The sky is cloudy this afternoon.
windy|/ˈwɪn.di/|adjective|có gió|It is too windy to ride a bike.
hot|/hɑːt/|adjective|nóng|Summer in Hanoi is very hot.
cold|/koʊld/|adjective|lạnh|Wear a coat, it is cold outside.
warm|/wɔːrm/|adjective|ấm áp|Spring is warm and pleasant.
cool|/kuːl/|adjective|mát mẻ|The evening air is cool.
storm|/stɔːrm/|noun|cơn bão|The storm broke many trees.
weather|/ˈweð.ɚ/|noun|thời tiết|What is the weather like today?`,
      'Gia đình': `father|/ˈfɑː.ðɚ/|noun|bố|My father is a doctor.
mother|/ˈmʌð.ɚ/|noun|mẹ|My mother cooks very well.
brother|/ˈbrʌð.ɚ/|noun|anh/em trai|My brother plays the guitar.
sister|/ˈsɪs.tɚ/|noun|chị/em gái|My sister is a student.
grandmother|/ˈɡræn.mʌð.ɚ/|noun|bà|My grandmother tells funny stories.
grandfather|/ˈɡræn.fɑː.ðɚ/|noun|ông|My grandfather likes gardening.
son|/sʌn/|noun|con trai|They have one son.
daughter|/ˈdɑː.t̬ɚ/|noun|con gái|Their daughter is five years old.
uncle|/ˈʌŋ.kəl/|noun|chú/bác/cậu|My uncle lives in Da Nang.
family|/ˈfæm.əl.i/|noun|gia đình|I love my family.`,
      'Đồ ăn & đồ uống': `rice|/raɪs/|noun|cơm, gạo|We eat rice every day.
bread|/bred/|noun|bánh mì|I have bread for breakfast.
egg|/eɡ/|noun|quả trứng|She boils an egg.
chicken|/ˈtʃɪk.ɪn/|noun|thịt gà|Chicken soup is delicious.
fish|/fɪʃ/|noun|cá|My cat loves fish.
apple|/ˈæp.əl/|noun|quả táo|An apple a day keeps the doctor away.
water|/ˈwɑː.t̬ɚ/|noun|nước|Drink more water.
milk|/mɪlk/|noun|sữa|Children need milk.
coffee|/ˈkɑː.fi/|noun|cà phê|My dad drinks coffee every morning.
tea|/tiː/|noun|trà|Would you like some tea?`,
      'Phương tiện': `car|/kɑːr/|noun|ô tô|My uncle has a new car.
bus|/bʌs/|noun|xe buýt|I go to work by bus.
bicycle|/ˈbaɪ.sɪ.kəl/|noun|xe đạp|She rides a bicycle to school.
motorbike|/ˈmoʊ.t̬ɚ.baɪk/|noun|xe máy|Many people in Vietnam use a motorbike.
train|/treɪn/|noun|tàu hỏa|The train leaves at eight.
plane|/pleɪn/|noun|máy bay|We flew to Phu Quoc by plane.
boat|/boʊt/|noun|thuyền|They crossed the river by boat.
taxi|/ˈtæk.si/|noun|xe taxi|Let's take a taxi home.
ticket|/ˈtɪk.ɪt/|noun|vé|I bought two train tickets.
station|/ˈsteɪ.ʃən/|noun|nhà ga, bến|The bus station is near my house.`,
    },
  },
  {
    group: 'Theo level', slug: 'a2', name: 'A2 (3.0-3.5)', difficulty: 2,
    description: 'Nền tảng giao tiếp hằng ngày',
    sets: {
      'Công việc': `job|/dʒɑːb/|noun|công việc|She found a new job last month.
office|/ˈɑː.fɪs/|noun|văn phòng|I work in an office in the city centre.
manager|/ˈmæn.ə.dʒɚ/|noun|quản lý|The manager called a meeting.
salary|/ˈsæl.ɚ.i/|noun|tiền lương|He gets his salary at the end of the month.
meeting|/ˈmiː.t̬ɪŋ/|noun|cuộc họp|The meeting starts at nine.
colleague|/ˈkɑː.liːɡ/|noun|đồng nghiệp|My colleagues are very friendly.
interview|/ˈɪn.t̬ɚ.vjuː/|noun|buổi phỏng vấn|I have a job interview tomorrow.
experience|/ɪkˈspɪr.i.əns/|noun|kinh nghiệm|Do you have any experience in sales?
busy|/ˈbɪz.i/|adjective|bận rộn|I am too busy to have lunch.
retire|/rɪˈtaɪr/|verb|nghỉ hưu|My father will retire next year.`,
      'Sức khỏe': `headache|/ˈhed.eɪk/|noun|đau đầu|I have a terrible headache.
fever|/ˈfiː.vɚ/|noun|sốt|The child has a high fever.
medicine|/ˈmed.ɪ.sən/|noun|thuốc|Take this medicine twice a day.
healthy|/ˈhel.θi/|adjective|khỏe mạnh|Eating vegetables keeps you healthy.
exercise|/ˈek.sɚ.saɪz/|noun|tập thể dục|Regular exercise is good for your heart.
hospital|/ˈhɑː.spɪ.t̬əl/|noun|bệnh viện|She works at a big hospital.
patient|/ˈpeɪ.ʃənt/|noun|bệnh nhân|The doctor is talking to a patient.
cough|/kɑːf/|verb|ho|He couldn't stop coughing all night.
rest|/rest/|verb|nghỉ ngơi|You should rest for a few days.
diet|/ˈdaɪ.ət/|noun|chế độ ăn uống|A balanced diet is important.`,
      'Du lịch': `travel|/ˈtræv.əl/|verb|đi du lịch|I love to travel around Vietnam.
passport|/ˈpæs.pɔːrt/|noun|hộ chiếu|Don't forget your passport.
luggage|/ˈlʌɡ.ɪdʒ/|noun|hành lý|Our luggage is very heavy.
hotel|/hoʊˈtel/|noun|khách sạn|We stayed in a small hotel by the sea.
beach|/biːtʃ/|noun|bãi biển|The children played on the beach.
map|/mæp/|noun|bản đồ|Can you show me on the map?
souvenir|/ˌsuː.vəˈnɪr/|noun|quà lưu niệm|I bought some souvenirs for my friends.
tourist|/ˈtʊr.ɪst/|noun|khách du lịch|Hoi An is full of tourists in summer.
flight|/flaɪt/|noun|chuyến bay|Our flight was delayed for two hours.
book|/bʊk/|verb|đặt (phòng, vé)|I booked a room for two nights.`,
    },
  },
];
