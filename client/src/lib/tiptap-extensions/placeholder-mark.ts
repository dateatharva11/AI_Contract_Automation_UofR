import { Mark } from '@tiptap/core';

export const PlaceholderMark = Mark.create({
  name: 'placeholder',
  
  addAttributes() {
    return {
      'data-field': {
        default: null,
        parseHTML: element => element.getAttribute('data-field'),
        renderHTML: attributes => {
          if (!attributes['data-field']) {
            return {};
          }
          return {
            'data-field': attributes['data-field'],
          };
        },
      },
    };
  },
  
  parseHTML() {
    return [
      {
        tag: 'span[data-field]',
        getAttrs: (element) => {
          return {
            'data-field': (element as HTMLElement).getAttribute('data-field'),
          };
        },
      },
    ];
  },
  
  renderHTML({ mark, HTMLAttributes }) {
    return [
      'span',
      { ...HTMLAttributes, class: 'placeholder-span' },
      0,
    ];
  },
});