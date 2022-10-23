import * as fs from 'fs';
import * as path from 'path';
import { subject_id } from './config';
import request from './utils/request';

const outputPath = path.resolve(__dirname, '../output/马克思主义/应用题');

enum CategoryName {
  CHOICE1 = '单项选择题',
  CHOICE2 = '单选题',
  MORE_CHOICE = '多选题',
  SUBJECTIVE = '主观题',
  SHORT_ANSWER = '简答题',
  DISCUSS = '论述题'
}

const getExamPaperPageList = async () => {
  const res = await request.get('https://ios.api.daniujiaoyu.org/pc/api/pcweb/exampaper/getexampaperpagelist', {
    params: {
      page: 1,
      limit: 999,
      subject_id,
      plate: 801,
    },
  });
  return res.data.list as {
    name: string;
    sheet_id: string
  }[];
};

interface AAA {
  category_name: CategoryName;
  topic_no: string;
  topic_title: string;
  answer: string;
  itemList: {}[];
  analysis: string;
}

const getErrorTopicAnalysisPageList = async (sheet_id: string) => {
  const res = await request.get('https://ios.api.daniujiaoyu.org/pc/api/pcweb/answersheet/geterrortopicanalysispagelist', {
      params: {
        page: 1,
        limit: 9999,
        sheet_id,
        analysis_type: 2,
      },
    },
  );
  return res.data as {
    paper: {
      name: string
    },
    list: AAA[]
  };
};

const getExamPaperPageList2 = async () => {
  const res = await request.get('https://ios.api.daniujiaoyu.org/pc/api/pcweb/exampaper/getexampaperpagelist', {
    params: {
      page: 1,
      limit: 9999,
      subject_id,
      plate: 802,
    },
  }) as {
    data: {
      list: {
        name: string;
        paper_id: string;
      }[];
    }
  };
  return res.data.list;
};

const getExamPaperTopicPageList = async (paper_id: string) => {
  const res = await request.get('https://ios.api.daniujiaoyu.org/pc/api/pcweb/exampaper/getexampapertopicpagelist', {
    params: {
      page: 1,
      limit: 9999,
      paper_id,
    },
  }) as {
    data: {
      paper: {
        name: string;
      },
      list: AAA[]
    }
  };
  return res.data as {
    paper: {
      name: string
    },
    list: AAA[]
  };
};

const getTemplate = (data: any, hasNo = false, type = 0) => {
  const {
    topic_no,
    topic_title,
    answer,
    itemList,
    analysis,
  } = data;
  if (type === 0) {
    let title = `${topic_title}（${answer.join('').toString()}）\n`;
    if (hasNo) {
      title = `${topic_no}、` + title;
    }
    const items = itemList.map((i: { item_no: string; content: string; }) => `${i.item_no} ${i.content}\n`).join('');
    const bottom = `解析：${analysis}\n`;
    return title + items + bottom;
  } else if (type === 1) {
    let title = `${topic_title}\n`;
    if (hasNo) {
      title = `${topic_no}、` + title;
    }
    const items = itemList.map((i: { item_no: string; content: string; }) => `${i.item_no} ${i.content}\n`).join('');
    const bottom = `答案：${answer.join('').toString()}\n`;
    return title + items + bottom;
  }
};

const outputList = async ({name = '', sheet_id = '', paper_id = ''}) => {
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath);
  }

  let data;
  if (sheet_id) {
    data = await getErrorTopicAnalysisPageList(sheet_id);
  }
  if (paper_id) {
    data = await getExamPaperTopicPageList(paper_id);
  }

  if (data?.list) {
    // generateChoice(name, data.list);
    generateApplied(name, data.list);
    // 简答题
  }
  return 'success';
};

const generateChoice = (title: string, list: AAA[]) => {
  const listData = list
    .filter(l => l.category_name.includes(CategoryName.CHOICE1) || l.category_name.includes(CategoryName.CHOICE2) || l.category_name.includes(CategoryName.MORE_CHOICE))
    .map(({topic_no, topic_title, answer, itemList, analysis}) => ({
      topic_no,
      topic_title,
      answer,
      itemList,
      analysis,
    }));
  const titleStr = `${title}（选择题）\n\n`;
  const str = titleStr + listData.map(l => getTemplate(l, false, 0)).join('\n');

  fs.writeFile(path.resolve(outputPath, `${title}.txt`), str, (err) => {
    if (err) {
      console.log(err);
    }
  });
};

const generateApplied = (title: string, list: AAA[]) => {
  const listData = list
    .filter(l => l.category_name.includes(CategoryName.DISCUSS) || l.category_name.includes(CategoryName.SHORT_ANSWER))
    .map(({topic_no, topic_title, answer, itemList, analysis}) => ({
      topic_no,
      topic_title,
      answer,
      itemList,
      analysis,
    }));
  const titleStr = `${title}\n\n`;
  const str = titleStr + listData.map(l => getTemplate(l, false, 1)).join('\n');

  fs.writeFile(path.resolve(outputPath, `${title}.txt`), str, (err) => {
    if (err) {
      console.log(err);
    }
  });
};

!(async function () {
  const paperList = await getExamPaperPageList();
  paperList.forEach(p => {
    void outputList({
      name: p.name,
      sheet_id: p.sheet_id,
    });
  });
  const data = await getExamPaperPageList2();
  data.forEach(p => {
    void outputList({
      name: p.name,
      paper_id: p.paper_id,
    });
  });
})();
