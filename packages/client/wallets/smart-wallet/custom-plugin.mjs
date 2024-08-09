import pkg from 'typedoc-plugin-markdown';
const { MarkdownPageEvent, MarkdownTheme, MarkdownThemeContext } = pkg;
 
export function load(app) {
  app.renderer.defineTheme('crossmintTheme', CrossmintTheme);

  app.renderer.postRenderAsyncJobs.push(async (renderer) => {
    const navigation = renderer.navigation;

    // sort the Error classes to the end of the list for navigation
    const classesIndex = navigation.findIndex(item => item.title === "Classes");
    if (classesIndex !== -1) {
        navigation[classesIndex].children.sort((a, b) => {
            const isErrorA = a.title.endsWith("Error");
            const isErrorB = b.title.endsWith("Error");
            if (isErrorA && !isErrorB) return 1;
            if (!isErrorA && isErrorB) return -1;
            return a.title.localeCompare(b.title);
        });
    }

    const resultArray = navigation.map(item => ({
        group: item.title,
        pages: item.children.map(child => `sdk-reference/smart-wallets/${child.path.replace('.mdx', '')}`)
    }));

    // simply output to console, we then manually copy/paste into mint.json in Mintlify
    console.log(JSON.stringify(resultArray));
  });

  // this adds the title to top of every mdx file as Mintlify expects
  // @todo - add description to important SDK classes and set `description` here also
  app.renderer.on(MarkdownPageEvent.BEGIN, (page) => {
    page.frontmatter = {
      title: page.model?.name,
      ...page.frontmatter,
    };
  });

  app.renderer.on(MarkdownPageEvent.END, (page) => {
    // remove .mdx from links so it works with mintlify
    page.contents = page.contents.replace(/\.mdx/g, "");
  });
}

class CrossmintTheme extends MarkdownTheme {
  getRenderContext(page) {
    return new CrossmintThemeContext(this, page, this.application.options);
  }
}

class CrossmintThemeContext extends MarkdownThemeContext {
  // customise templates
  templates = {
    ...this.templates,
    
  };
  
  // customise partials
  partials = {
    ...this.partials,
    parametersTable: (model) => {
      return "test";

    },
  };
 
  // customise helpers
  helpers = {
    ...this.helpers
  };
}