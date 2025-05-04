interface GenreBadgeProps {
  genre: string;
}

const GenreBadge = ({ genre }: GenreBadgeProps) => {
  return (
    <span className="px-2 py-1 bg-background-light text-text-secondary text-xs rounded">
      {genre}
    </span>
  );
};

export default GenreBadge;
